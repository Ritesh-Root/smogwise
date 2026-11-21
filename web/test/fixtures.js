export const PLACE = { lat: 28.65, lng: 77.31, label: 'Anand Vihar, Delhi, India' };

export const PLAN_RESPONSE = {
  location: { label: 'Anand Vihar, Delhi, India', lat: 28.65, lng: 77.31, utcOffsetMinutes: 330 },
  air: {
    index: { code: 'ind_cpcb', name: 'NAQI (IN)', aqi: 211, category: 'Poor air quality', higherIsWorse: true },
    dominantPollutant: 'pm25',
    pollutants: [
      { code: 'pm25', name: 'PM2.5', value: 79.5, units: 'µg/m³' },
      { code: 'no2', name: 'NO2', value: 36.9, units: 'ppb' },
    ],
    healthAdvice: 'Avoid intense activities outdoors.',
    severity: 3,
    severityLabel: 'Poor',
    forecast: [
      {
        time: '2026-11-18T02:30:00Z',
        index: { code: 'ind_cpcb', aqi: 190, category: 'Moderate air quality', higherIsWorse: true },
        severity: 2,
      },
      {
        time: '2026-11-18T10:00:00Z',
        index: { code: 'ind_cpcb', aqi: 120, category: 'Moderate air quality', higherIsWorse: true },
        severity: 2,
      },
      {
        time: '2026-11-18T14:00:00Z',
        index: { code: 'ind_cpcb', aqi: 250, category: 'Poor air quality', higherIsWorse: true },
        severity: 3,
      },
    ],
  },
  groupAdvice: [{ member: 'children', advice: 'Keep children indoors.' }],
  impact: {
    commute: {
      mode: 'car_petrol',
      label: 'Petrol car (alone)',
      weeklyKm: 120,
      co2KgWeek: 20.4,
      pm25GWeek: 1.2,
      alternatives: [
        {
          mode: 'metro',
          label: 'Metro or train',
          co2SavedKgWeek: 16.8,
          co2SavedKgYear: 874,
          co2SavedPercent: 82,
          pm25SavedGWeek: 1.2,
        },
      ],
    },
    outdoor: {
      best: { time: '2026-11-18T10:00:00Z', aqi: 120, category: 'Moderate air quality' },
      worst: { time: '2026-11-18T14:00:00Z', aqi: 250, category: 'Poor air quality' },
      reductionPercent: 52,
    },
  },
  plan: {
    summary: 'Air is poor today, so protect the children first.',
    alerts: ['Keep children indoors this morning.'],
    routine: [{ time: '15:00', action: 'Walk to the park', impact: 'AQI is 52% lower than at peak' }],
    indoor: [{ tip: 'Wet-mop floors', impact: 'Removes settled dust', cost: 'Free' }],
    alternatives: [{ swap: 'Take the metro', impact: 'Saves 16.8 kg of CO2 a week' }],
  },
};

/** The request the app builds for PLACE with the default household. */
export const PLAN_REQUEST = {
  lat: PLACE.lat,
  lng: PLACE.lng,
  label: PLACE.label,
  utcOffsetMinutes: 330,
  profile: {
    household: [],
    commuteMode: 'car_petrol',
    commuteKm: 20,
    commuteDays: 5,
    cookingFuel: 'lpg',
    heating: 'none',
    hasPurifier: false,
    notes: '',
    language: 'en',
  },
};

/** Same request, asking for a Hindi plan. */
export const HINDI_REQUEST = { ...PLAN_REQUEST, profile: { ...PLAN_REQUEST.profile, language: 'hi' } };

/** fetch stub: routes by URL fragment (first match wins) and records every call. */
export function stubFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : undefined, signal: init?.signal });
    const route = routes.find(([fragment]) => String(url).includes(fragment));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const [, status, body] = route;
    return { ok: status < 400, status, json: async () => body };
  };
  return { impl, calls };
}
