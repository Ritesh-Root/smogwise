// @ts-check
/** Numeric limits and timings used across the server. The browser imports LIMITS too, so both sides agree. */

/** Input limits shared by request validation and the form. */
export const LIMITS = Object.freeze({
  placeQueryMin: 2,
  placeQueryMax: 120,
  labelMax: 120,
  notesMax: 300,
  questionMin: 2,
  questionMax: 500,
  /** Chat turns sent back with a question. Six turns of Hindi text still fit in JSON_BODY_LIMIT. */
  historyTurns: 6,
  historyTextMax: 1200,
  commuteKmMax: 300,
  commuteDaysMax: 7,
  maxUtcOffsetMinutes: 14 * 60,
});

/** Largest request body accepted: 6 history turns of 1200 Hindi characters (3 bytes each) plus the profile. */
export const JSON_BODY_LIMIT = '32kb';

/** Limits on what the model may return in a plan. */
export const PLAN_LIMITS = Object.freeze({ items: 8, alerts: 4, text: 600, timeLabel: 60, cost: 80 });

export const UPSTREAM_TIMEOUT_MS = 8_000;
export const MODEL_TIMEOUT_MS = 30_000;

export const TEMPERATURE = 0.4;
export const PLAN_MAX_OUTPUT_TOKENS = 4096;
export const CHAT_MAX_OUTPUT_TOKENS = 2048;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;

export const AIR_CACHE = Object.freeze({ ttlMs: 10 * MINUTE_MS, max: 500 });
export const GEOCODE_CACHE = Object.freeze({ ttlMs: 24 * HOUR_MS, max: 1000 });

/** Requests per client per minute: any API route, and the two routes that call the paid model. */
export const RATE_LIMITS = Object.freeze({ perMinute: 30, modelPerMinute: 10 });
/** Model calls allowed per hour on one server instance, a ceiling on spend if limits are bypassed. */
export const MODEL_CALLS_PER_HOUR = 600;

/** Coordinates are rounded to this many decimals (about 1 km) for cache keys and lookups. */
export const GRID_DECIMALS = 2;

/**
 * Cache key for a grid cell.
 * @param {number} lat
 * @param {number} lng
 */
export const gridKey = (lat, lng) => `${lat.toFixed(GRID_DECIMALS)},${lng.toFixed(GRID_DECIMALS)}`;
