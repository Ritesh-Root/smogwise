import path from 'node:path';
import compression from 'compression';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { commuteImpact, outdoorWindows, severity, SEVERITY_LABELS } from './engine/impact.js';
import { HttpError } from './errors.js';
import { chatRequestSchema, locationQuerySchema, planRequestSchema } from './validation.js';

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

/** Parse input with a zod schema, turning failures into a 400 the client can display. */
function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, `Invalid input: ${issue.path.join('.') || 'request'} - ${issue.message}`);
  }
  return result.data;
}

/**
 * Build the Express app. Services are injected so tests can run without network access.
 * @param {{
 *   airQuality: {getSnapshot: (lat: number, lng: number) => Promise<any>},
 *   geocoder: {search: (q: string) => Promise<any>, reverse: (lat: number, lng: number) => Promise<any>},
 *   assistant: {generatePlan: (context: object) => Promise<any>, answer: (context: object, question: string, history: any[]) => Promise<string>},
 *   rateLimitPerMinute?: number,
 *   log?: (entry: object) => void,
 * }} deps
 */
export function createApp({ airQuality, geocoder, assistant, rateLimitPerMinute = 30, log = (entry) => console.error(JSON.stringify(entry)) }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Cloud Run puts exactly one proxy in front of the container.

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
    next();
  });
  app.use(compression());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));

  const api = express.Router();
  api.use(rateLimit({ windowMs: 60_000, limit: rateLimitPerMinute, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please wait a minute and try again.' } }));
  api.use(express.json({ limit: '10kb' }));
  api.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  /** Everything the assistant and the UI need to know about one household, gathered once. */
  async function buildContext({ lat, lng, label, utcOffsetMinutes, profile }) {
    const air = await airQuality.getSnapshot(lat, lng);
    const level = severity(air.index);
    return {
      location: { label, lat, lng, utcOffsetMinutes },
      air: { ...air, severity: level, severityLabel: SEVERITY_LABELS[level] },
      impact: {
        commute: commuteImpact(profile),
        outdoor: outdoorWindows(air.forecast, utcOffsetMinutes),
      },
      profile,
    };
  }

  api.get('/location', async (req, res) => {
    const query = parse(locationQuerySchema, req.query);
    res.json('q' in query ? await geocoder.search(query.q) : await geocoder.reverse(query.lat, query.lng));
  });

  api.post('/plan', async (req, res) => {
    const context = await buildContext(parse(planRequestSchema, req.body));
    const plan = await assistant.generatePlan(context);
    res.json({ location: context.location, air: context.air, impact: context.impact, plan });
  });

  api.post('/chat', async (req, res) => {
    const { question, history, ...rest } = parse(chatRequestSchema, req.body);
    const context = await buildContext(rest);
    res.json({ answer: await assistant.answer(context, question, history) });
  });

  api.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);

  // Central error handler: client-safe messages only; details go to the log.
  app.use((error, req, res, _next) => {
    const status = error instanceof HttpError ? error.status : (error.status === 400 || error.status === 413) ? error.status : 502;
    if (status >= 500) log({ severity: 'ERROR', message: error.message, path: req.path });
    const message = error instanceof HttpError ? error.message : status === 502 ? 'A data service is temporarily unavailable. Please try again shortly.' : 'Invalid request.';
    res.status(status).json({ error: message });
  });

  return app;
}
