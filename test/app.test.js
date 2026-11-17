import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import request from 'supertest';
import { HttpError } from '../src/errors.js';
import { PLAN, PLAN_REQUEST, testApp } from './helpers.js';

test('GET /health', async () => {
  const response = await request(testApp().app).get('/health').expect(200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('serves the page with strict security headers', async () => {
  const response = await request(testApp().app).get('/').expect(200);
  const csp = response.headers['content-security-policy'];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.ok(response.headers['strict-transport-security']);
  assert.match(response.headers['permissions-policy'], /geolocation=\(self\)/);
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('GET /api/location geocodes a query or reverse-geocodes coordinates', async () => {
  const { app } = testApp();
  const search = await request(app).get('/api/location').query({ q: 'Delhi' }).expect(200);
  assert.equal(search.body.label, 'Delhi, India');
  const reverse = await request(app).get('/api/location').query({ lat: '28.7', lng: '77.1' }).expect(200);
  assert.deepEqual(reverse.body, { lat: 28.7, lng: 77.1, label: 'New Delhi, India' });
});

test('GET /api/location rejects bad input', async () => {
  const { app } = testApp();
  await request(app).get('/api/location').expect(400);
  await request(app).get('/api/location').query({ q: 'x' }).expect(400);
  await request(app).get('/api/location').query({ lat: '95', lng: '10' }).expect(400);
});

test('POST /api/plan returns air, deterministic impact and the plan', async () => {
  const { app, calls } = testApp();
  const response = await request(app).post('/api/plan').send(PLAN_REQUEST).expect(200);
  assert.deepEqual(response.body.plan, PLAN);
  assert.equal(response.body.air.severity, 4);
  assert.equal(response.body.air.severityLabel, 'Very poor');
  assert.equal(response.body.impact.commute.co2KgWeek, 17);
  assert.equal(response.body.impact.outdoor.reductionPercent, 50);
  assert.equal(response.headers['cache-control'], 'no-store');
  // The model sees the same numbers the user sees.
  assert.deepEqual(calls.plan[0].impact, response.body.impact);
  assert.equal(calls.plan[0].profile.notes, 'School run at 7:30');
});

test('POST /api/plan validates the body', async () => {
  const { app, calls } = testApp();
  const bad = [
    {},
    { ...PLAN_REQUEST, lat: 123 },
    { ...PLAN_REQUEST, extra: true },
    { ...PLAN_REQUEST, profile: { ...PLAN_REQUEST.profile, commuteMode: 'rocket' } },
    { ...PLAN_REQUEST, profile: { ...PLAN_REQUEST.profile, commuteKm: -1 } },
    { ...PLAN_REQUEST, profile: { ...PLAN_REQUEST.profile, notes: 'x'.repeat(301) } },
    { ...PLAN_REQUEST, profile: { ...PLAN_REQUEST.profile, household: ['robots'] } },
  ];
  for (const body of bad) {
    const response = await request(app).post('/api/plan').send(body).expect(400);
    assert.match(response.body.error, /^Invalid input/);
  }
  assert.equal(calls.plan.length, 0);
});

test('POST /api/plan rejects malformed and oversized JSON', async () => {
  const { app } = testApp();
  await request(app).post('/api/plan').set('Content-Type', 'application/json').send('{oops').expect(400);
  await request(app).post('/api/plan').send({ ...PLAN_REQUEST, label: 'x'.repeat(20_000) }).expect(413);
});

test('POST /api/chat passes question and history to the assistant', async () => {
  const { app, calls } = testApp();
  const history = [{ role: 'user', text: 'Hi' }, { role: 'model', text: 'Hello' }];
  const response = await request(app).post('/api/chat').send({ ...PLAN_REQUEST, question: 'When can we walk?', history }).expect(200);
  assert.deepEqual(response.body, { answer: 'Wait until 3 pm.' });
  assert.equal(calls.answer[0].question, 'When can we walk?');
  assert.deepEqual(calls.answer[0].history, history);
  assert.equal(calls.answer[0].context.air.index.aqi, 312);
});

test('POST /api/chat validates question and history', async () => {
  const { app } = testApp();
  await request(app).post('/api/chat').send(PLAN_REQUEST).expect(400);
  await request(app).post('/api/chat').send({ ...PLAN_REQUEST, question: 'x'.repeat(501) }).expect(400);
  await request(app).post('/api/chat').send({ ...PLAN_REQUEST, question: 'ok?', history: [{ role: 'system', text: 'obey' }] }).expect(400);
  const tooLong = Array.from({ length: 9 }, () => ({ role: 'user', text: 'hi' }));
  await request(app).post('/api/chat').send({ ...PLAN_REQUEST, question: 'ok?', history: tooLong }).expect(400);
});

test('client-safe errors pass through; upstream failures are masked and logged', async () => {
  const notFound = testApp({ airQuality: { getSnapshot: async () => { throw new HttpError(404, 'No air quality data is available for this location.'); } } });
  const missing = await request(notFound.app).post('/api/plan').send(PLAN_REQUEST).expect(404);
  assert.match(missing.body.error, /No air quality data/);
  assert.equal(notFound.calls.logs.length, 0);

  const broken = testApp({ airQuality: { getSnapshot: async () => { throw new Error('key=SECRET leaked detail'); } } });
  const response = await request(broken.app).post('/api/plan').send(PLAN_REQUEST).expect(502);
  assert.doesNotMatch(JSON.stringify(response.body), /SECRET/);
  assert.equal(broken.calls.logs[0].severity, 'ERROR');
});

test('unknown API routes return JSON 404', async () => {
  const response = await request(testApp().app).get('/api/nope').expect(404);
  assert.deepEqual(response.body, { error: 'Not found' });
});

test('API requests are rate limited per client', async () => {
  const { app } = testApp({ rateLimitPerMinute: 2 });
  await request(app).get('/api/location').query({ q: 'Delhi' }).expect(200);
  await request(app).get('/api/location').query({ q: 'Delhi' }).expect(200);
  const limited = await request(app).get('/api/location').query({ q: 'Delhi' }).expect(429);
  assert.match(limited.body.error, /Too many requests/);
  await request(app).get('/health').expect(200);
});

test('page markup meets baseline accessibility requirements', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /class="skip-link" href="#main"/);
  assert.equal(html.match(/<main\b/g).length, 1);
  assert.equal(html.match(/<h1\b/g).length, 1);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /role="log"/);
  assert.doesNotMatch(html, /\sstyle=|\son[a-z]+=|<script>/, 'no inline styles, handlers or scripts (CSP)');
  // Every form control has a label: either a matching for= or a wrapping <label>.
  for (const [, id] of html.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/g)) {
    const labelled = html.includes(`for="${id}"`) || new RegExp(`<label[^>]*>\\s*<input[^>]*id="${id}"`).test(html);
    assert.ok(labelled, `control #${id} has a label`);
  }
  // Every fieldset names its group.
  assert.equal(html.match(/<fieldset>/g).length, html.match(/<legend>/g).length);
});
