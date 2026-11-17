import { HttpError } from '../errors.js';
import { TtlCache } from './cache.js';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Client for the Google Maps Platform Geocoding API.
 * @param {{apiKey: string, fetchImpl?: typeof fetch, cache?: TtlCache}} options
 */
export function createGeocoder({ apiKey, fetchImpl = fetch, cache = new TtlCache({ ttlMs: 24 * 3_600_000, max: 1000 }) }) {
  async function lookup(params) {
    const url = `${GEOCODE_URL}?${new URLSearchParams({ ...params, key: apiKey })}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Geocoding API responded ${response.status}`);
    const data = await response.json();
    if (data.status === 'ZERO_RESULTS') throw new HttpError(404, 'We could not find that place. Try a city or neighbourhood name.');
    if (data.status !== 'OK') throw new Error(`Geocoding API status ${data.status}`);
    const [best] = data.results;
    return {
      lat: best.geometry.location.lat,
      lng: best.geometry.location.lng,
      label: best.formatted_address,
    };
  }

  return {
    /** @param {string} query place name typed by the user */
    search(query) {
      return cache.getOrCompute(`q:${query.toLowerCase()}`, () => lookup({ address: query }));
    },
    /** @param {number} lat @param {number} lng */
    async reverse(lat, lng) {
      const key = `r:${lat.toFixed(2)},${lng.toFixed(2)}`;
      const place = await cache.getOrCompute(key, () =>
        lookup({ latlng: `${lat},${lng}`, result_type: 'locality|sublocality|administrative_area_level_2' }),
      );
      return { lat, lng, label: place.label };
    },
  };
}
