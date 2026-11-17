// Starts the production server code with fixed fake data in place of Google Maps and Gemini,
// so browser tests are fast, free and repeatable. Run `npm run build` first.
import { createApp } from '../src/app.js';

const HOUR_MS = 3_600_000;
const index = (aqi, category) => ({ code: 'ind_cpcb', name: 'NAQI (IN)', aqi, category, higherIsWorse: true });
const start = Math.ceil(Date.now() / HOUR_MS) * HOUR_MS;
const AQI_BY_HOUR = [
  212, 205, 190, 178, 160, 145, 130, 122, 120, 128, 140, 155, 170, 185, 200, 210, 218, 224, 228, 230, 226, 220, 215,
  211,
];

const snapshot = {
  index: index(211, 'Poor air quality'),
  dominantPollutant: 'pm25',
  pollutants: [
    { code: 'pm25', name: 'PM2.5', value: 79.5, units: 'µg/m³' },
    { code: 'no2', name: 'NO2', value: 36.9, units: 'ppb' },
  ],
  healthAdvice: 'Avoid intense activities outdoors.',
  healthByGroup: { children: 'Keep children indoors.', lungDiseasePopulation: 'Keep your inhaler with you.' },
  forecast: AQI_BY_HOUR.map((aqi, i) => ({
    time: new Date(start + i * HOUR_MS).toISOString(),
    index: index(aqi, aqi > 200 ? 'Poor air quality' : 'Moderate air quality'),
  })),
};

const plans = {
  en: {
    summary: 'Air is poor today, so protect the children and anyone with asthma first.',
    alerts: ['Keep children indoors this morning.'],
    routine: [{ time: '15:00', action: 'Walk to the park', impact: 'AQI is 40% lower than at peak' }],
    indoor: [{ tip: 'Wet-mop floors', impact: 'Removes settled dust', cost: 'Free' }],
    alternatives: [{ swap: 'Take the metro', impact: 'Saves 14 kg of CO2 a week' }],
  },
  hi: {
    summary: 'आज हवा खराब है, इसलिए बच्चों और अस्थमा वालों का ध्यान पहले रखें।',
    alerts: ['सुबह बच्चों को घर के अंदर रखें।'],
    routine: [{ time: '15:00', action: 'पार्क में टहलें', impact: 'AQI चरम से 40% कम है' }],
    indoor: [{ tip: 'गीले कपड़े से फ़र्श पोंछें', impact: 'जमी धूल हटती है', cost: 'मुफ़्त' }],
    alternatives: [{ swap: 'मेट्रो लें', impact: 'हर हफ़्ते 14 किलो CO2 बचता है' }],
  },
};

const app = createApp({
  airQuality: { getSnapshot: async () => snapshot },
  geocoder: {
    search: async (q) => ({ lat: 28.65, lng: 77.31, label: `${q}, India` }),
    reverse: async (lat, lng) => ({ lat, lng, label: 'New Delhi, India' }),
  },
  assistant: {
    generatePlan: async (context) => plans[context.profile.language],
    answer: async () => 'Wait until the **afternoon**: the air is cleanest around 15:00.',
  },
  rateLimitPerMinute: 10_000,
  modelRateLimitPerMinute: 10_000,
  modelCallsPerHour: 10_000,
});

app.listen(Number(process.env.E2E_PORT) || 4173);
