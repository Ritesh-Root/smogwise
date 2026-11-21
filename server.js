// @ts-check
import { GoogleGenAI } from '@google/genai';
import { createApp } from './src/app.js';
import { loadConfig } from './src/config.js';
import { logger } from './src/logger.js';
import { createAirQualityService } from './src/services/airQuality.js';
import { createAssistant } from './src/services/assistant.js';
import { createGeocoder } from './src/services/geocode.js';

const SHUTDOWN_GRACE_MS = 10_000;

function main() {
  const config = loadConfig();
  const ai = new GoogleGenAI({ vertexai: true, project: config.project, location: config.vertexLocation });
  const app = createApp({
    airQuality: createAirQualityService({ apiKey: config.mapsApiKey }),
    geocoder: createGeocoder({ apiKey: config.mapsApiKey }),
    assistant: createAssistant({ ai, model: config.model }),
  });

  const server = app.listen(config.port, () => {
    logger.info('SmogWise listening', { port: config.port, model: config.model });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down');
    server.close();
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
}

main();
