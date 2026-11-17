import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after } from 'node:test';
import { createApp } from '../src/app.js';

export const CPCB = (aqi, category = 'Poor') => ({
  code: 'ind_cpcb',
  name: 'AQI (India)',
  aqi,
  category,
  higherIsWorse: true,
});

export const SNAPSHOT = {
  index: CPCB(312, 'Very poor'),
  dominantPollutant: 'pm25',
  pollutants: [{ code: 'pm25', name: 'PM2.5', value: 180.5, units: 'µg/m³' }],
  healthAdvice: 'Avoid outdoor exertion.',
  healthByGroup: {
    generalPopulation: 'Avoid outdoor exertion.',
    children: 'Keep children indoors.',
    lungDiseasePopulation: 'Keep your reliever inhaler with you.',
    athletes: 'Train indoors.',
  },
  forecast: [
    { time: '2026-11-18T02:30:00Z', index: CPCB(400, 'Very poor') }, // 08:00 IST
    { time: '2026-11-18T09:30:00Z', index: CPCB(200, 'Moderate') }, // 15:00 IST
    { time: '2026-11-18T20:30:00Z', index: CPCB(100, 'Satisfactory') }, // 02:00 IST, asleep
  ],
};

export const PLAN = {
  summary: 'Air is very poor today.',
  alerts: ['Keep children indoors this morning.'],
  routine: [{ time: '15:00', action: 'Walk then', impact: 'AQI is 50% lower' }],
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

export const PLAN_REQUEST_BODY = {
  lat: 28.61,
  lng: 77.21,
  label: 'New Delhi, India',
  utcOffsetMinutes: 330,
  profile: PROFILE,
};

/** The prompt context a request turns into, for tests that call the assistant or prompt directly. */
export const CONTEXT = {
  location: { label: 'New Delhi', lat: 28.61, lng: 77.21, utcOffsetMinutes: 330 },
  air: {
    index: SNAPSHOT.index,
    dominantPollutant: 'pm25',
    pollutants: SNAPSHOT.pollutants,
    healthAdvice: SNAPSHOT.healthAdvice,
    forecast: SNAPSHOT.forecast,
    severity: 4,
    severityLabel: 'Very poor',
  },
  impact: {
    commute: { co2KgWeek: 17, alternatives: [] },
    outdoor: {
      best: { time: SNAPSHOT.forecast[1].time, aqi: 200, category: 'Moderate' },
      worst: { time: SNAPSHOT.forecast[0].time, aqi: 400, category: 'Very poor' },
      reductionPercent: 50,
    },
  },
  profile: PROFILE,
  groupAdvice: [{ member: 'children', advice: 'Keep children indoors.' }],
};

/** A tiny stand-in for the Vite build output, so static serving can be tested without building. */
export function createPublicDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'smogwise-public-'));
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(
    path.join(dir, 'index.html'),
    '<!doctype html><html lang="en"><title>SmogWise</title><div id="root"></div>',
  );
  writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'export {};');
  after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export const PUBLIC_DIR = createPublicDir();

/** App wired to fakes; pass overrides to replace a service or limit. `calls` records what the fakes saw. */
export function testApp(overrides = {}) {
  const calls = { snapshot: [], plan: [], answer: [], logs: [] };
  const app = createApp({
    airQuality: {
      getSnapshot: async (lat, lng, language) => {
        calls.snapshot.push({ lat, lng, language });
        return SNAPSHOT;
      },
    },
    geocoder: {
      search: async (q) => ({ lat: 28.61, lng: 77.21, label: `${q}, India` }),
      reverse: async (lat, lng) => ({ lat, lng, label: 'New Delhi, India' }),
    },
    assistant: {
      generatePlan: async (context) => {
        calls.plan.push(context);
        return PLAN;
      },
      answer: async (context, question, history) => {
        calls.answer.push({ context, question, history });
        return 'Wait until 3 pm.';
      },
    },
    publicDir: PUBLIC_DIR,
    log: (entry) => calls.logs.push(entry),
    ...overrides,
  });
  return { app, calls };
}

/** Fake fetch that answers from [urlFragment, status, body] routes and records each request. */
export function fakeFetch(routes) {
  const requests = [];
  const impl = async (url, init = {}) => {
    requests.push({ url: String(url), headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes.find(([fragment]) => String(url).includes(fragment));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const [, status, body] = route;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { impl, requests };
}
