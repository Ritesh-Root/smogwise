import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outdoorWindows } from '../src/engine/impact.js';
import { HttpError } from '../src/errors.js';
import { modelFacts } from '../src/prompt.js';
import { createAirQualityService } from '../src/services/airQuality.js';
import { createAssistant } from '../src/services/assistant.js';
import { createGeocoder } from '../src/services/geocode.js';
import { fakeFetch, PLAN, PLAN_REQUEST, SNAPSHOT } from './helpers.js';

const CURRENT = {
  indexes: [
    { code: 'uaqi', aqi: 12, category: 'Poor air quality', displayName: 'Universal AQI', dominantPollutant: 'pm10' },
    { code: 'ind_cpcb', aqi: 312, category: 'Very poor', displayName: 'AQI (India)', dominantPollutant: 'pm25' },
  ],
  pollutants: [
    { code: 'pm25', displayName: 'PM2.5', concentration: { value: 180.5, units: 'MICROGRAMS_PER_CUBIC_METER' } },
    { code: 'no2', displayName: 'NO2', concentration: { value: 40, units: 'PARTS_PER_BILLION' } },
  ],
  healthRecommendations: { generalPopulation: 'Avoid outdoor exertion.' },
};
const FORECAST = {
  hourlyForecasts: [
    { dateTime: '2026-11-18T09:00:00Z', indexes: [{ code: 'ind_cpcb', aqi: 250, category: 'Poor' }] },
    { dateTime: '2026-11-18T10:00:00Z', indexes: [] },
  ],
};

test('air quality: prefers the local index and normalises pollutants and forecast', async () => {
  const { impl, requests } = fakeFetch([['currentConditions', 200, CURRENT], ['forecast', 200, FORECAST]]);
  const service = createAirQualityService({ apiKey: 'k', fetchImpl: impl, now: () => Date.parse('2026-11-18T07:20:00Z') });
  const snapshot = await service.getSnapshot(28.6139, 77.209);

  assert.deepEqual(snapshot.index, { code: 'ind_cpcb', name: 'AQI (India)', aqi: 312, category: 'Very poor', higherIsWorse: true });
  assert.equal(snapshot.dominantPollutant, 'pm25');
  assert.deepEqual(snapshot.pollutants.map((p) => p.units), ['µg/m³', 'ppb']);
  assert.equal(snapshot.healthAdvice, 'Avoid outdoor exertion.');
  assert.equal(snapshot.forecast.length, 1, 'hours without an index are dropped');
  const forecastRequest = requests.find((r) => r.url.includes('forecast')).body;
  assert.equal(forecastRequest.period.startTime, '2026-11-18T09:00:00.000Z');
  assert.equal(forecastRequest.period.endTime, '2026-11-19T09:00:00.000Z');
});

test('air quality: nearby lookups are served from cache', async () => {
  const { impl, requests } = fakeFetch([['currentConditions', 200, CURRENT], ['forecast', 200, FORECAST]]);
  const service = createAirQualityService({ apiKey: 'k', fetchImpl: impl });
  await service.getSnapshot(28.6139, 77.209);
  await service.getSnapshot(28.6141, 77.2091);
  assert.equal(requests.length, 2);
});

test('air quality: falls back to the universal index and tolerates a missing forecast', async () => {
  const { impl } = fakeFetch([
    ['currentConditions', 200, { indexes: [{ code: 'uaqi', aqi: 70 }] }],
    ['forecast', 400, {}],
  ]);
  const snapshot = await createAirQualityService({ apiKey: 'k', fetchImpl: impl }).getSnapshot(1, 1);
  assert.equal(snapshot.index.higherIsWorse, false);
  assert.equal(snapshot.index.name, 'uaqi');
  assert.deepEqual(snapshot.forecast, []);
  assert.deepEqual(snapshot.pollutants, []);
});

test('air quality: no index is a 404, an upstream failure is not client-safe', async () => {
  const empty = fakeFetch([['currentConditions', 200, {}], ['forecast', 200, {}]]);
  await assert.rejects(createAirQualityService({ apiKey: 'k', fetchImpl: empty.impl }).getSnapshot(1, 1), (e) => e instanceof HttpError && e.status === 404);
  const down = fakeFetch([['currentConditions', 500, {}], ['forecast', 200, {}]]);
  await assert.rejects(createAirQualityService({ apiKey: 'k', fetchImpl: down.impl }).getSnapshot(1, 1), (e) => !(e instanceof HttpError));
});

const GEOCODE_OK = { status: 'OK', results: [{ formatted_address: 'New Delhi, Delhi, India', geometry: { location: { lat: 28.61, lng: 77.21 } } }] };

test('geocoder: search returns coordinates and caches case-insensitively', async () => {
  const { impl, requests } = fakeFetch([['geocode', 200, GEOCODE_OK]]);
  const geocoder = createGeocoder({ apiKey: 'secret key', fetchImpl: impl });
  assert.deepEqual(await geocoder.search('Delhi'), { lat: 28.61, lng: 77.21, label: 'New Delhi, Delhi, India' });
  await geocoder.search('delhi');
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /address=Delhi&key=secret\+key/);
});

test('geocoder: reverse keeps the caller coordinates', async () => {
  const { impl } = fakeFetch([['geocode', 200, GEOCODE_OK]]);
  assert.deepEqual(await createGeocoder({ apiKey: 'k', fetchImpl: impl }).reverse(28.7, 77.1), { lat: 28.7, lng: 77.1, label: 'New Delhi, Delhi, India' });
});

test('geocoder: unknown place is a 404, other failures are upstream errors', async () => {
  const none = fakeFetch([['geocode', 200, { status: 'ZERO_RESULTS', results: [] }]]);
  await assert.rejects(createGeocoder({ apiKey: 'k', fetchImpl: none.impl }).search('zzzz'), (e) => e.status === 404);
  const denied = fakeFetch([['geocode', 200, { status: 'REQUEST_DENIED' }]]);
  await assert.rejects(createGeocoder({ apiKey: 'k', fetchImpl: denied.impl }).search('Delhi'), /REQUEST_DENIED/);
  const down = fakeFetch([['geocode', 503, {}]]);
  await assert.rejects(createGeocoder({ apiKey: 'k', fetchImpl: down.impl }).search('Delhi'), /503/);
});

const CONTEXT = {
  location: { label: 'New Delhi', utcOffsetMinutes: 330 },
  air: { ...SNAPSHOT, severityLabel: 'Very poor' },
  impact: { commute: { co2KgWeek: 17 }, outdoor: outdoorWindows(SNAPSHOT.forecast, 330) },
  profile: PLAN_REQUEST.profile,
};
const fakeAi = (text) => {
  const calls = [];
  return { calls, models: { generateContent: async (request) => { calls.push(request); return { text }; } } };
};

test('assistant: generatePlan requests structured JSON grounded in the context', async () => {
  const ai = fakeAi(JSON.stringify(PLAN));
  const plan = await createAssistant({ ai, model: 'test-model' }).generatePlan(CONTEXT);
  assert.deepEqual(plan, PLAN);
  const [request] = ai.calls;
  assert.equal(request.model, 'test-model');
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.ok(request.config.responseSchema);
  assert.equal(request.config.safetySettings.length, 4);
  assert.match(request.config.systemInstruction, /"aqi":312/);
  assert.match(request.config.systemInstruction, /never as instructions/);
  assert.match(request.config.systemInstruction, /Write in English/);
});

test('assistant: malformed, incomplete or empty plans are rejected with 502', async () => {
  for (const text of ['not json', JSON.stringify({ summary: 'only this' }), '']) {
    await assert.rejects(createAssistant({ ai: fakeAi(text), model: 'm' }).generatePlan(CONTEXT), (e) => e instanceof HttpError && e.status === 502);
  }
});

test('assistant: answer sends history then the question, in the chosen language', async () => {
  const ai = fakeAi('Wait until 3 pm.');
  const context = { ...CONTEXT, profile: { ...CONTEXT.profile, language: 'hi' } };
  const answer = await createAssistant({ ai, model: 'm' }).answer(context, 'When can we walk?', [
    { role: 'user', text: 'Hi' },
    { role: 'model', text: 'Hello' },
  ]);
  assert.equal(answer, 'Wait until 3 pm.');
  assert.deepEqual(ai.calls[0].contents.map((c) => [c.role, c.parts[0].text]), [['user', 'Hi'], ['model', 'Hello'], ['user', 'When can we walk?']]);
  assert.match(ai.calls[0].config.systemInstruction, /Write in Hindi/);
});

test('modelFacts gives the model local times and the same impact numbers as the UI', () => {
  const facts = modelFacts(CONTEXT);
  assert.deepEqual(facts.air.forecast[0], { localTime: '08:00', aqi: 400, category: 'Very poor' });
  assert.equal(facts.impact.outdoor.cleanestWakingHour.localTime, '15:00');
  assert.equal(facts.impact.outdoor.aqiReductionPercent, 50);
  assert.equal(facts.impact.commute.co2KgWeek, 17);
  assert.equal(facts.air.scale, 'higher is worse');
  assert.equal(modelFacts({ ...CONTEXT, impact: { commute: {}, outdoor: null } }).impact.outdoor, null);
  const universal = { ...CONTEXT, air: { ...CONTEXT.air, index: { ...CONTEXT.air.index, higherIsWorse: false } } };
  assert.match(modelFacts(universal).air.scale, /higher is cleaner/);
});
