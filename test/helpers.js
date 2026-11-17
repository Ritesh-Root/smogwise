import { createApp } from '../src/app.js';

export const CPCB = (aqi, category = 'Poor') => ({ code: 'ind_cpcb', name: 'AQI (India)', aqi, category, higherIsWorse: true });

export const SNAPSHOT = {
  index: CPCB(312, 'Very poor'),
  dominantPollutant: 'pm25',
  pollutants: [{ code: 'pm25', name: 'PM2.5', value: 180.5, units: 'µg/m³' }],
  healthAdvice: 'Avoid outdoor exertion.',
  forecast: [
    { time: '2026-11-18T02:30:00Z', index: CPCB(400, 'Very poor') }, // 08:00 IST
    { time: '2026-11-18T09:30:00Z', index: CPCB(200, 'Moderate') }, // 15:00 IST
    { time: '2026-11-18T20:30:00Z', index: CPCB(100, 'Satisfactory') }, // 02:00 IST, asleep
  ],
};

export const PLAN = {
  summary: 'Air is very poor today.',
  alerts: ['Keep children indoors this morning.'],
  routine: [{ time: '3 pm', action: 'Walk then', impact: 'AQI is 50% lower' }],
  indoor: [{ tip: 'Wet-mop floors', impact: 'Removes settled dust', cost: 'Free' }],
  alternatives: [{ swap: 'Take the metro', impact: 'Saves 14 kg CO2 a week' }],
};

export const PROFILE = {
  household: ['children', 'asthma'],
  commuteMode: 'car_petrol',
  commuteKm: 20,
  commuteDays: 5,
  cookingFuel: 'lpg',
  heating: 'none',
  hasPurifier: false,
  notes: 'School run at 7:30',
  language: 'en',
};

export const PLAN_REQUEST = { lat: 28.61, lng: 77.21, label: 'New Delhi, India', utcOffsetMinutes: 330, profile: PROFILE };

/** App wired to fakes; pass overrides to replace a service or record calls. */
export function testApp(overrides = {}) {
  const calls = { plan: [], answer: [], logs: [] };
  const app = createApp({
    airQuality: { getSnapshot: async () => SNAPSHOT },
    geocoder: {
      search: async (q) => ({ lat: 28.61, lng: 77.21, label: `${q}, India` }),
      reverse: async (lat, lng) => ({ lat, lng, label: 'New Delhi, India' }),
    },
    assistant: {
      generatePlan: async (context) => { calls.plan.push(context); return PLAN; },
      answer: async (context, question, history) => { calls.answer.push({ context, question, history }); return 'Wait until 3 pm.'; },
    },
    log: (entry) => calls.logs.push(entry),
    ...overrides,
  });
  return { app, calls };
}

/** Fake fetch that answers from a list of [urlFragment, status, body] routes and records requests. */
export function fakeFetch(routes) {
  const requests = [];
  const impl = async (url, init = {}) => {
    requests.push({ url: String(url), body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes.find(([fragment]) => String(url).includes(fragment));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const [, status, body] = route;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { impl, requests };
}
