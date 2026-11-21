// @ts-check
import { GEOCODE_CACHE, UPSTREAM_TIMEOUT_MS, gridKey } from '../constants.js';
import { HttpError, UpstreamError } from '../errors.js';
import { TtlCache } from './cache.js';

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Client for the Google Maps Platform Geocoding API.
 * @param {{apiKey: string, fetchImpl?: typeof fetch, cache?: TtlCache<Promise<import('../types.js').Place>>}} options
 * @returns {import('../types.js').Geocoder}
 */
export function createGeocoder({ apiKey, fetchImpl = fetch, cache = new TtlCache(GEOCODE_CACHE) }) {
  /** @param {Record<string, string>} params */
  async function lookup(params) {
    const url = `${GEOCODE_URL}?${new URLSearchParams({ ...params, key: apiKey })}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!response.ok) throw new UpstreamError(`Geocoding API responded ${response.status}`);
    const data = await response.json();
    if (data.status === 'ZERO_RESULTS') {
      throw new HttpError(404, 'We could not find that place. Try a city or neighbourhood name.');
    }
    if (data.status !== 'OK') throw new UpstreamError(`Geocoding API status ${data.status}`);
    const [best] = data.results;
    return { lat: best.geometry.location.lat, lng: best.geometry.location.lng, label: best.formatted_address };
  }

  return {
    search(query) {
      return cache.getOrCompute(`q:${query.toLowerCase()}`, () => lookup({ address: query }));
    },
    async reverse(lat, lng) {
      const place = await cache.getOrCompute(`r:${gridKey(lat, lng)}`, () =>
        lookup({ latlng: `${lat},${lng}`, result_type: 'locality|sublocality|administrative_area_level_2' }),
      );
      return { lat, lng, label: place.label };
    },
  };
}
