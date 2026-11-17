import { HttpError } from '../errors.js';
import { TtlCache } from './cache.js';

const BASE_URL = 'https://airquality.googleapis.com/v1';
const FORECAST_HOURS = 24;
const HOUR_MS = 3_600_000;

/**
 * Prefer the local index (CPCB in India, EPA in the US) because that is the scale residents
 * know. Google's Universal AQI is the fallback; it runs 0-100 where higher is cleaner.
 * @param {Array<{code: string, aqi?: number, category?: string, displayName?: string}>} indexes
 */
function pickIndex(indexes = []) {
  const index = indexes.find((i) => i.code !== 'uaqi' && i.aqi !== undefined) ?? indexes.find((i) => i.aqi !== undefined);
  if (!index) return null;
  return {
    code: index.code,
    name: index.displayName ?? index.code,
    aqi: index.aqi,
    category: index.category ?? '',
    higherIsWorse: index.code !== 'uaqi',
  };
}

/**
 * Client for the Google Maps Platform Air Quality API.
 * @param {{apiKey: string, fetchImpl?: typeof fetch, cache?: TtlCache, now?: () => number}} options
 */
export function createAirQualityService({
  apiKey,
  fetchImpl = fetch,
  cache = new TtlCache({ ttlMs: 10 * 60_000, max: 500 }),
  now = Date.now,
}) {
  async function post(path, body) {
    const response = await fetchImpl(`${BASE_URL}/${path}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Air Quality API ${path} responded ${response.status}`);
    return response.json();
  }

  async function fetchCurrent(location) {
    const data = await post('currentConditions:lookup', {
      location,
      extraComputations: ['LOCAL_AQI', 'POLLUTANT_CONCENTRATION', 'HEALTH_RECOMMENDATIONS'],
    });
    const index = pickIndex(data.indexes);
    if (!index) throw new HttpError(404, 'No air quality data is available for this location.');
    return {
      index,
      dominantPollutant: data.indexes.find((i) => i.code === index.code)?.dominantPollutant ?? '',
      pollutants: (data.pollutants ?? []).map((p) => ({
        code: p.code,
        name: p.displayName ?? p.code,
        value: p.concentration?.value ?? null,
        units: p.concentration?.units === 'PARTS_PER_BILLION' ? 'ppb' : 'µg/m³',
      })),
      healthAdvice: data.healthRecommendations?.generalPopulation ?? '',
    };
  }

  /** The forecast is not offered everywhere, so a failure here yields an empty list. */
  async function fetchForecast(location) {
    const start = Math.ceil(now() / HOUR_MS) * HOUR_MS + HOUR_MS;
    try {
      const data = await post('forecast:lookup', {
        location,
        period: {
          startTime: new Date(start).toISOString(),
          endTime: new Date(start + FORECAST_HOURS * HOUR_MS).toISOString(),
        },
        pageSize: FORECAST_HOURS,
        extraComputations: ['LOCAL_AQI'],
      });
      return (data.hourlyForecasts ?? [])
        .map((hour) => ({ time: hour.dateTime, index: pickIndex(hour.indexes) }))
        .filter((hour) => hour.index);
    } catch {
      return [];
    }
  }

  return {
    /**
     * Current conditions plus the next 24 hours, cached per ~1 km grid cell.
     * @param {number} lat
     * @param {number} lng
     */
    getSnapshot(lat, lng) {
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      return cache.getOrCompute(key, async () => {
        const location = { latitude: lat, longitude: lng };
        const [current, forecast] = await Promise.all([fetchCurrent(location), fetchForecast(location)]);
        return { ...current, forecast };
      });
    },
  };
}
