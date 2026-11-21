import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError, UpstreamError } from '../../src/errors.js';
import { createAirQualityService } from '../../src/services/airQuality.js';
import { fakeFetch } from '../helpers.js';

const CURRENT = {
  indexes: [
    { code: 'uaqi', aqi: 12, category: 'Poor air quality', displayName: 'Universal AQI', dominantPollutant: 'pm10' },
    { code: 'gbr_defra', aqi: 8, category: 'High', displayName: 'DAQI' },
    { code: 'ind_cpcb', aqi: 312, category: 'Very poor', displayName: 'AQI (India)', dominantPollutant: 'pm25' },
  ],
  pollutants: [
    { code: 'pm25', displayName: 'PM2.5', concentration: { value: 180.5, units: 'MICROGRAMS_PER_CUBIC_METER' } },
    { code: 'no2', displayName: 'NO2', concentration: { value: 40, units: 'PARTS_PER_BILLION' } },
  ],
  healthRecommendations: { generalPopulation: 'Avoid outdoor exertion.', children: 'Keep children indoors.' },
};
const FORECAST = {
  hourlyForecasts: [
    { dateTime: '2026-11-18T09:00:00Z', indexes: [{ code: 'ind_cpcb', aqi: 250, category: 'Poor' }] },
    { dateTime: '2026-11-18T10:00:00Z', indexes: [] },
  ],
};
const ROUTES = [
  ['currentConditions', 200, CURRENT],
  ['forecast', 200, FORECAST],
];
const service = (routes, options = {}) => {
  const { impl, requests } = fakeFetch(routes);
  return {
    requests,
    air: createAirQualityService({ apiKey: 'secret-key', fetchImpl: impl, warn: () => {}, ...options }),
  };
};

describe('air quality service', () => {
  it('prefers the local index it can score and normalises pollutants and health advice', async () => {
    const { air } = service(ROUTES);
    const snapshot = await air.getSnapshot(28.6139, 77.209);
    assert.deepEqual(snapshot.index, {
      code: 'ind_cpcb',
      name: 'AQI (India)',
      aqi: 312,
      category: 'Very poor',
      higherIsWorse: true,
    });
    assert.equal(snapshot.dominantPollutant, 'pm25');
    assert.deepEqual(
      snapshot.pollutants.map((p) => p.units),
      ['µg/m³', 'ppb'],
    );
    assert.equal(snapshot.healthAdvice, 'Avoid outdoor exertion.');
    assert.equal(snapshot.healthByGroup.children, 'Keep children indoors.');
  });

  it('keeps forecast hours that have an index and drops the rest', async () => {
    const { air } = service(ROUTES, { now: () => Date.parse('2026-11-18T07:20:00Z') });
    const { forecast } = await air.getSnapshot(28.6, 77.2);
    assert.equal(forecast.length, 1);
    assert.equal(forecast[0].index.aqi, 250);
  });

  it('asks for the next 24 hours starting at the next full hour', async () => {
    const { air, requests } = service(ROUTES, { now: () => Date.parse('2026-11-18T07:20:00Z') });
    await air.getSnapshot(28.6, 77.2);
    const { period } = requests.find((r) => r.url.includes('forecast')).body;
    assert.equal(period.startTime, '2026-11-18T09:00:00.000Z');
    assert.equal(period.endTime, '2026-11-19T09:00:00.000Z');
  });

  it('sends the key in a header, never in the URL, and requests the chosen language', async () => {
    const { air, requests } = service(ROUTES);
    await air.getSnapshot(28.6, 77.2, 'hi');
    for (const request of requests) {
      assert.equal(request.headers['X-Goog-Api-Key'], 'secret-key');
      assert.doesNotMatch(request.url, /secret-key|key=/);
      assert.equal(request.body.languageCode, 'hi');
    }
  });

  it('serves nearby lookups in the same language from cache, but not other languages', async () => {
    const { air, requests } = service(ROUTES);
    await air.getSnapshot(28.6139, 77.209);
    await air.getSnapshot(28.6141, 77.2091);
    assert.equal(requests.length, 2);
    await air.getSnapshot(28.6139, 77.209, 'hi');
    assert.equal(requests.length, 4);
  });

  it('falls back to the universal index where no scorable local index exists', async () => {
    const london = {
      indexes: [
        { code: 'uaqi', aqi: 76, category: 'Good air quality' },
        { code: 'gbr_defra', aqi: 8, category: 'High' },
      ],
    };
    const { air } = service([
      ['currentConditions', 200, london],
      ['forecast', 400, {}],
    ]);
    const snapshot = await air.getSnapshot(51.5, -0.12);
    assert.equal(snapshot.index.code, 'uaqi');
    assert.equal(snapshot.index.higherIsWorse, false);
  });

  it('tolerates a missing forecast but logs a warning', async () => {
    const warnings = [];
    const { air } = service(
      [
        ['currentConditions', 200, { indexes: [{ code: 'uaqi', aqi: 70 }] }],
        ['forecast', 400, {}],
      ],
      {
        warn: (message) => warnings.push(message),
      },
    );
    const snapshot = await air.getSnapshot(1, 1);
    assert.deepEqual(snapshot.forecast, []);
    assert.deepEqual(snapshot.pollutants, []);
    assert.deepEqual(warnings, ['Air quality forecast unavailable']);
  });

  it('reports no data as a 404 the user can see', async () => {
    const { air } = service([
      ['currentConditions', 200, {}],
      ['forecast', 200, {}],
    ]);
    await assert.rejects(air.getSnapshot(1, 1), (error) => error instanceof HttpError && error.status === 404);
  });

  it('reports an upstream failure as an UpstreamError, not a client error', async () => {
    const { air } = service([
      ['currentConditions', 500, {}],
      ['forecast', 200, {}],
    ]);
    await assert.rejects(air.getSnapshot(1, 1), (error) => error instanceof UpstreamError && /500/.test(error.message));
  });
});
