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
      { time: '2026-11-18T02:30:00Z', index: { code: 'ind_cpcb', aqi: 190, category: 'Moderate air quality', higherIsWorse: true }, severity: 2 },
      { time: '2026-11-18T10:00:00Z', index: { code: 'ind_cpcb', aqi: 120, category: 'Moderate air quality', higherIsWorse: true }, severity: 2 },
      { time: '2026-11-18T14:00:00Z', index: { code: 'ind_cpcb', aqi: 250, category: 'Poor air quality', higherIsWorse: true }, severity: 3 },
    ],
  },
  impact: {
    commute: {
      mode: 'car_petrol', label: 'Petrol car (alone)', weeklyKm: 120, co2KgWeek: 20.4, pm25GWeek: 1.2,
      alternatives: [
        { mode: 'metro', label: 'Metro or train', co2SavedKgWeek: 16.8, co2SavedKgYear: 874, co2SavedPercent: 82 },
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
    routine: [{ time: '3 pm', action: 'Walk to the park', impact: 'AQI is 52% lower than at peak' }],
    indoor: [{ tip: 'Wet-mop floors', impact: 'Removes settled dust', cost: 'Free' }],
    alternatives: [{ swap: 'Take the metro', impact: 'Saves 16.8 kg of CO2 a week' }],
  },
};

/** fetch stub: routes by URL fragment and records every call. */
export function stubFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : undefined });
    const route = routes.find(([fragment]) => String(url).includes(fragment));
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const [, status, body] = route;
    return { ok: status < 400, status, json: async () => body };
  };
  return { impl, calls };
}
