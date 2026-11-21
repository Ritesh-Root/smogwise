// @ts-check
import path from 'node:path';
import compression from 'compression';
import express from 'express';
import { MODEL_CALLS_PER_HOUR, RATE_LIMITS } from './constants.js';
import { log as defaultLog } from './logger.js';
import { createErrorHandler } from './middleware/errors.js';
import { createRateLimiters } from './middleware/rateLimits.js';
import { securityHeaders } from './middleware/security.js';
import { createApiRouter } from './routes/api.js';

const DEFAULT_PUBLIC_DIR = path.join(import.meta.dirname, '..', 'dist', 'client');

/**
 * Build the Express app. Services are injected so tests can run without network access.
 * @param {{
 *   airQuality: import('./types.js').AirQualityService,
 *   geocoder: import('./types.js').Geocoder,
 *   assistant: import('./types.js').Assistant,
 *   rateLimitPerMinute?: number,
 *   modelRateLimitPerMinute?: number,
 *   modelCallsPerHour?: number,
 *   publicDir?: string,
 *   log?: (entry: import('./logger.js').LogEntry) => void,
 *   now?: () => number,
 * }} deps
 */
export function createApp({
  airQuality,
  geocoder,
  assistant,
  rateLimitPerMinute = RATE_LIMITS.perMinute,
  modelRateLimitPerMinute = RATE_LIMITS.modelPerMinute,
  modelCallsPerHour = MODEL_CALLS_PER_HOUR,
  publicDir = DEFAULT_PUBLIC_DIR,
  log = defaultLog,
  now = Date.now,
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Cloud Run puts exactly one proxy in front of the container.

  app.use(securityHeaders());
  app.use(compression());
  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  });
  // Vite fingerprints everything under /assets, so it can be cached for a year; the HTML must always revalidate.
  app.use(
    '/assets',
    express.static(path.join(publicDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  );
  app.use(express.static(publicDir, { maxAge: 0, etag: true }));

  const limiters = createRateLimiters({
    perMinute: rateLimitPerMinute,
    modelPerMinute: modelRateLimitPerMinute,
    modelCallsPerHour,
    now,
  });
  app.use('/api', createApiRouter({ airQuality, geocoder, assistant, limiters }));
  app.use(createErrorHandler(log));

  return app;
}
