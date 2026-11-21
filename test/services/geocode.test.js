import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError, UpstreamError } from '../../src/errors.js';
import { createGeocoder } from '../../src/services/geocode.js';
import { fakeFetch } from '../helpers.js';

const OK = {
  status: 'OK',
  results: [{ formatted_address: 'New Delhi, Delhi, India', geometry: { location: { lat: 28.61, lng: 77.21 } } }],
};
const geocoder = (routes) => {
  const { impl, requests } = fakeFetch(routes);
  return { requests, geocoder: createGeocoder({ apiKey: 'secret key', fetchImpl: impl }) };
};

describe('geocoder', () => {
  it('returns coordinates for a place name and caches case-insensitively', async () => {
    const { geocoder: g, requests } = geocoder([['geocode', 200, OK]]);
    assert.deepEqual(await g.search('Delhi'), { lat: 28.61, lng: 77.21, label: 'New Delhi, Delhi, India' });
    await g.search('delhi');
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /address=Delhi&key=secret\+key/);
  });

  it('reverse geocodes but keeps the coordinates the caller supplied', async () => {
    const { geocoder: g } = geocoder([['geocode', 200, OK]]);
    assert.deepEqual(await g.reverse(28.7, 77.1), { lat: 28.7, lng: 77.1, label: 'New Delhi, Delhi, India' });
  });

  it('reports an unknown place as a 404', async () => {
    const { geocoder: g } = geocoder([['geocode', 200, { status: 'ZERO_RESULTS', results: [] }]]);
    await assert.rejects(g.search('zzzz'), (error) => error instanceof HttpError && error.status === 404);
  });

  it('reports a denied key or a failing service as an UpstreamError', async () => {
    await assert.rejects(
      geocoder([['geocode', 200, { status: 'REQUEST_DENIED' }]]).geocoder.search('Delhi'),
      UpstreamError,
    );
    await assert.rejects(geocoder([['geocode', 503, {}]]).geocoder.search('Delhi'), /503/);
  });
});
