// @ts-check
import { rateLimit } from 'express-rate-limit';
import { HOUR_MS, MINUTE_MS } from '../constants.js';

/**
 * A ceiling on paid model calls per instance. Per-client limits stop one visitor; this stops spend
 * if many clients (or many instances' worth of limits) are used together.
 * @param {{limit: number, windowMs: number, now: () => number}} options
 * @returns {import('express').RequestHandler}
 */
function createBudgetGuard({ limit, windowMs, now }) {
  let windowStart = now();
  let used = 0;
  return (_req, res, next) => {
    const time = now();
    if (time - windowStart >= windowMs) {
      windowStart = time;
      used = 0;
    }
    if (used >= limit) {
      res.set('Retry-After', String(Math.ceil((windowStart + windowMs - time) / 1000)));
      res.status(503).json({ error: 'SmogWise is very busy right now. Please try again in a few minutes.' });
      return;
    }
    used += 1;
    next();
  };
}

/**
 * @param {string} error
 * @param {number} limit
 */
const perMinute = (error, limit) =>
  rateLimit({ windowMs: MINUTE_MS, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error } });

/**
 * @param {{perMinute: number, modelPerMinute: number, modelCallsPerHour: number, now?: () => number}} options
 */
export function createRateLimiters({ perMinute: general, modelPerMinute, modelCallsPerHour, now = Date.now }) {
  return {
    /** Any API route. */
    general: perMinute('Too many requests. Please wait a minute and try again.', general),
    /** The two routes that call Gemini, which cost money. */
    model: perMinute('You are asking too quickly. Please wait a minute and try again.', modelPerMinute),
    budget: createBudgetGuard({ limit: modelCallsPerHour, windowMs: HOUR_MS, now }),
  };
}
