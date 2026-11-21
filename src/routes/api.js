// @ts-check
import express from 'express';
import { JSON_BODY_LIMIT } from '../constants.js';
import { buildContext } from '../context.js';
import { HttpError } from '../errors.js';
import { apiNotFound } from '../middleware/errors.js';
import { chatRequestSchema, locationQuerySchema, planRequestSchema } from '../validation.js';

/**
 * Validate input with a zod schema, turning failures into a 400 the client can display.
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} input
 * @returns {T}
 */
function parseOrThrow(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, `Invalid input: ${issue.path.join('.') || 'request'} - ${issue.message}`);
  }
  return result.data;
}

/**
 * The JSON API: place lookup, plan generation and follow-up chat.
 * @param {{
 *   airQuality: import('../types.js').AirQualityService,
 *   geocoder: import('../types.js').Geocoder,
 *   assistant: import('../types.js').Assistant,
 *   limiters: ReturnType<typeof import('../middleware/rateLimits.js').createRateLimiters>,
 * }} deps
 */
export function createApiRouter({ airQuality, geocoder, assistant, limiters }) {
  const api = express.Router();
  // Limits run before the body is parsed, so rejected requests cost almost nothing.
  api.use(limiters.general);
  api.use(['/plan', '/chat'], limiters.model, limiters.budget);
  api.use(express.json({ limit: JSON_BODY_LIMIT }));
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  api.get('/location', async (req, res) => {
    const query = parseOrThrow(locationQuerySchema, req.query);
    res.json('q' in query ? await geocoder.search(query.q) : await geocoder.reverse(query.lat, query.lng));
  });

  api.post('/plan', async (req, res) => {
    const context = await buildContext(airQuality, parseOrThrow(planRequestSchema, req.body));
    const plan = await assistant.generatePlan(context);
    res.json({
      location: context.location,
      air: context.air,
      impact: context.impact,
      groupAdvice: context.groupAdvice,
      plan,
    });
  });

  api.post('/chat', async (req, res) => {
    const { question, history, ...request } = parseOrThrow(chatRequestSchema, req.body);
    const context = await buildContext(airQuality, request);
    res.json({ answer: await assistant.answer(context, question, history) });
  });

  api.use(apiNotFound);
  return api;
}
