import { describe, expect, it, vi } from 'vitest';
import { askQuestion, createPlan, findPlace, reversePlace } from '../api.js';
import { LIMITS } from '../constants.js';
import { PLAN_REQUEST, stubFetch } from './fixtures.js';

const stub = (routes) => {
  const fetchStub = stubFetch(routes);
  vi.stubGlobal('fetch', fetchStub.impl);
  return fetchStub.calls;
};

describe('api client', () => {
  it('rounds coordinates to about 1 km before they leave the browser', async () => {
    const calls = stub([['location', 200, {}]]);
    await reversePlace(28.61391234, 77.20902345);
    expect(calls[0].url).toBe('/api/location?lat=28.61&lng=77.21');
  });

  it('encodes place names', async () => {
    const calls = stub([['location', 200, {}]]);
    await findPlace('Anand Vihar & Delhi');
    expect(calls[0].url).toBe('/api/location?q=Anand%20Vihar%20%26%20Delhi');
  });

  it('gives every request a timeout', async () => {
    const calls = stub([['api/plan', 200, {}]]);
    await createPlan(PLAN_REQUEST);
    expect(calls[0].signal).toBeInstanceOf(AbortSignal);
  });

  it('sends only the most recent history the server accepts, with each turn shortened to its limit', async () => {
    const calls = stub([['api/chat', 200, { answer: 'ok' }]]);
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 ? 'model' : 'user',
      text: 'x'.repeat(LIMITS.historyTextMax + 50),
    }));
    await askQuestion(PLAN_REQUEST, 'Why?', history);
    const sent = calls[0].body.history;
    expect(sent).toHaveLength(LIMITS.historyTurns);
    expect(sent.every((turn) => turn.text.length === LIMITS.historyTextMax)).toBe(true);
  });

  it('shows the server message for a failed request and a generic one when there is none', async () => {
    stub([['api/plan', 502, { error: 'A data service is temporarily unavailable.' }]]);
    await expect(createPlan(PLAN_REQUEST)).rejects.toThrow('A data service is temporarily unavailable.');
    vi.stubGlobal('fetch', async () => ({
      ok: false,
      json: async () => {
        throw new Error('not json');
      },
    }));
    await expect(createPlan(PLAN_REQUEST)).rejects.toThrow('Something went wrong. Please try again.');
  });

  it('explains a timeout and keeps the original error as the cause', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', async () => {
      throw timeout;
    });
    await expect(createPlan(PLAN_REQUEST)).rejects.toMatchObject({
      message: expect.stringMatching(/taking longer/),
      cause: timeout,
    });
  });
});
