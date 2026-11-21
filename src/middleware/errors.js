// @ts-check
import { HttpError, UpstreamError } from '../errors.js';

/** Statuses the body parser and static file handler raise that are safe to pass on. */
const PASS_THROUGH_STATUSES = new Set([400, 404, 413]);

const GENERIC_MESSAGES = /** @type {Record<number, string>} */ ({
  404: 'Not found',
  500: 'Something went wrong. Please try again.',
  502: 'A data service is temporarily unavailable. Please try again shortly.',
});

/**
 * HTTP status for an error: our own errors keep theirs, upstream failures are 502, parser errors
 * pass through, and anything else is a bug on our side (500).
 * @param {any} error
 */
export function statusFor(error) {
  if (error instanceof HttpError) return error.status;
  if (error instanceof UpstreamError) return 502;
  if (PASS_THROUGH_STATUSES.has(error.status)) return error.status;
  return 500;
}

/** Fallback for unknown API routes. */
export const apiNotFound = (
  /** @type {import('express').Request} */ _req,
  /** @type {import('express').Response} */ res,
) => res.status(404).json({ error: 'Not found' });

/**
 * Central error handler: clients get safe messages only; the stack and cause go to the log.
 * @param {(entry: import('../logger.js').LogEntry) => void} log
 * @returns {import('express').ErrorRequestHandler}
 */
export function createErrorHandler(log) {
  return (error, req, res, _next) => {
    const status = statusFor(error);
    if (status >= 500) {
      log({
        severity: 'ERROR',
        message: error.message,
        stack: error.stack,
        cause: error.cause ? String(error.cause) : undefined,
        status,
        method: req.method,
        path: req.path,
      });
    }
    const message = error instanceof HttpError ? error.message : (GENERIC_MESSAGES[status] ?? 'Invalid request.');
    res.status(status).json({ error: message });
  };
}
