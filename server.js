import { GoogleGenAI } from '@google/genai';
import { createApp } from './src/app.js';
import { config } from './src/config.js';
import { createAirQualityService } from './src/services/airQuality.js';
import { createAssistant } from './src/services/assistant.js';
import { createGeocoder } from './src/services/geocode.js';

if (!config.mapsApiKey || !config.project) {
  throw new Error('MAPS_API_KEY and GOOGLE_CLOUD_PROJECT must be set.');
}

const ai = new GoogleGenAI({ vertexai: true, project: config.project, location: config.vertexLocation });
const app = createApp({
  airQuality: createAirQualityService({ apiKey: config.mapsApiKey }),
  geocoder: createGeocoder({ apiKey: config.mapsApiKey }),
  assistant: createAssistant({ ai, model: config.model }),
});

const server = app.listen(config.port, () => console.log(`SmogWise listening on port ${config.port}`));
process.on('SIGTERM', () => server.close());
