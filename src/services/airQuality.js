// @ts-check
import { AIR_CACHE, HOUR_MS, UPSTREAM_TIMEOUT_MS, gridKey } from '../constants.js';
import { SUPPORTED_LOCAL_INDEXES } from '../engine/impact.js';
import { HttpError, UpstreamError } from '../errors.js';
import { logger } from '../logger.js';
import { TtlCache } from './cache.js';

const BASE_URL = 'https://airquality.googleapis.com/v1';
const FORECAST_HOURS = 24;

/**
 * Prefer the local index the app can score (CPCB in India, EPA in the US) because that is the scale
 * residents know. Any other country's index has unknown bands, so Google's Universal AQI is used
 * instead; it runs 0-100 where higher is cleaner.
 * @param {Array<{code: string, aqi?: number, category?: string, displayName?: string}>} [indexes]
 * @returns {import('../engine/impact.js').AqiIndex | null}
 */
function pickIndex(indexes = []) {
  const readings = indexes.filter((i) => i.aqi !== undefined);
  const index =
    readings.find((i) => SUPPORTED_LOCAL_INDEXES.includes(i.code)) ?? readings.find((i) => i.code === 'uaqi');
  if (!index) return null;
  return {
    code: index.code,
    name: index.displayName ?? index.code,
    aqi: /** @type {number} */ (index.aqi),
    category: index.category ?? '',
    higherIsWorse: index.code !== 'uaqi',
  };
}

/**
 * Build a function that POSTs JSON to the Air Quality API with the key in a header.
 * @param {string} apiKey
 * @param {typeof fetch} fetchImpl
 */
function createPoster(apiKey, fetchImpl) {
  return async (/** @type {string} */ path, /** @type {object} */ body) => {
    const response = await fetchImpl(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) throw new UpstreamError(`Air Quality API ${path} responded ${response.status}`);
    return response.json();
  };
}

/**
 * Current conditions: the index, pollutants and health advice.
 * @param {ReturnType<typeof createPoster>} post
 * @param {{latitude: number, longitude: number}} location
 * @param {string} languageCode
 */
async function fetchCurrent(post, location, languageCode) {
  const data = await post('currentConditions:lookup', {
    location,
    languageCode,
    extraComputations: ['LOCAL_AQI', 'POLLUTANT_CONCENTRATION', 'HEALTH_RECOMMENDATIONS'],
  });
  const index = pickIndex(data.indexes);
  if (!index) throw new HttpError(404, 'No air quality data is available for this location.');
  return {
    index,
    dominantPollutant:
      data.indexes.find((/** @type {{code: string}} */ i) => i.code === index.code)?.dominantPollutant ?? '',
    pollutants: (data.pollutants ?? []).map((/** @type {any} */ p) => ({
      code: p.code,
      name: p.displayName ?? p.code,
      value: p.concentration?.value ?? null,
      units: p.concentration?.units === 'PARTS_PER_BILLION' ? 'ppb' : 'µg/m³',
    })),
    healthAdvice: data.healthRecommendations?.generalPopulation ?? '',
    healthByGroup: data.healthRecommendations ?? {},
  };
}

/**
 * The next 24 hours. The forecast is not offered everywhere, so a failure here yields an empty list (and a warning).
 * @param {ReturnType<typeof createPoster>} post
 * @param {{latitude: number, longitude: number}} location
 * @param {string} languageCode
 * @param {{now: () => number, warn: (message: string, fields?: Record<string, unknown>) => void}} clock
 * @returns {Promise<import('../engine/impact.js').ForecastHour[]>}
 */
async function fetchForecast(post, location, languageCode, { now, warn }) {
  const start = Math.ceil(now() / HOUR_MS) * HOUR_MS + HOUR_MS;
  try {
    const data = await post('forecast:lookup', {
      location,
      languageCode,
      period: {
        startTime: new Date(start).toISOString(),
        endTime: new Date(start + FORECAST_HOURS * HOUR_MS).toISOString(),
      },
      pageSize: FORECAST_HOURS,
      extraComputations: ['LOCAL_AQI'],
    });
    return (data.hourlyForecasts ?? [])
      .map((/** @type {any} */ hour) => ({ time: hour.dateTime, index: pickIndex(hour.indexes) }))
      .filter((/** @type {{index: unknown}} */ hour) => hour.index);
  } catch (error) {
    warn('Air quality forecast unavailable', { cause: String(error) });
    return [];
  }
}

/**
 * Client for the Google Maps Platform Air Quality API.
 * @param {{
 *   apiKey: string,
 *   fetchImpl?: typeof fetch,
 *   cache?: TtlCache<Promise<import('../types.js').AirSnapshot>>,
 *   now?: () => number,
 *   warn?: (message: string, fields?: Record<string, unknown>) => void,
 * }} options
 * @returns {import('../types.js').AirQualityService}
 */
export function createAirQualityService({
  apiKey,
  fetchImpl = fetch,
  cache = new TtlCache(AIR_CACHE),
  now = Date.now,
  warn = logger.warn,
}) {
  const post = createPoster(apiKey, fetchImpl);
  return {
    /**
     * Current conditions plus the next 24 hours, cached per ~1 km grid cell and language.
     * @param {number} lat
     * @param {number} lng
     * @param {string} [language] BCP-47 code for category names and health advice
     */
    getSnapshot(lat, lng, language = 'en') {
      return cache.getOrCompute(`${gridKey(lat, lng)}|${language}`, async () => {
        const location = { latitude: lat, longitude: lng };
        const [current, forecast] = await Promise.all([
          fetchCurrent(post, location, language),
          fetchForecast(post, location, language, { now, warn }),
        ]);
        return { ...current, forecast };
      });
    },
  };
}
