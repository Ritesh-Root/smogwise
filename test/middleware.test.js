import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { HttpError, UpstreamError } from '../src/errors.js';
import { log as writeLog, logger } from '../src/logger.js';
import { createErrorHandler, statusFor } from '../src/middleware/errors.js';
import { createRateLimiters } from '../src/middleware/rateLimits.js';

describe('statusFor', () => {
  it('maps our own errors, upstream failures, parser errors and bugs', () => {
    assert.equal(statusFor(new HttpError(404, 'x')), 404);
    assert.equal(statusFor(new UpstreamError('x')), 502);
    assert.equal(statusFor(Object.assign(new Error('x'), { status: 413 })), 413);
    assert.equal(statusFor(Object.assign(new Error('x'), { status: 418 })), 500);
    assert.equal(statusFor(new TypeError('bug')), 500);
  });
});

describe('error handler', () => {
  const appThatThrows = (error, logs) => {
    const app = express();
    app.get('/boom', () => {
      throw error;
    });
    app.use(createErrorHandler((entry) => logs.push(entry)));
    return app;
  };

  it('logs the stack and cause of a failure, but shows the client only a generic message', async () => {
    const logs = [];
    const error = new UpstreamError('Gemini request failed', { cause: new Error('quota SECRET') });
    const response = await request(appThatThrows(error, logs)).get('/boom').expect(502);
    assert.doesNotMatch(JSON.stringify(response.body), /SECRET|Gemini/);
    assert.equal(logs[0].severity, 'ERROR');
    assert.match(logs[0].stack, /UpstreamError/);
    assert.match(logs[0].cause, /quota SECRET/);
    assert.equal(logs[0].path, '/boom');
  });

  it('reports a programming bug as a 500, not as a data-service outage', async () => {
    const logs = [];
    const response = await request(appThatThrows(new TypeError('x is undefined'), logs))
      .get('/boom')
      .expect(500);
    assert.match(response.body.error, /Something went wrong/);
    assert.equal(logs.length, 1);
  });

  it('passes a client-safe message through without logging it', async () => {
    const logs = [];
    const response = await request(appThatThrows(new HttpError(400, 'Invalid input: x'), logs))
      .get('/boom')
      .expect(400);
    assert.equal(response.body.error, 'Invalid input: x');
    assert.equal(logs.length, 0);
  });
});

describe('model call budget', () => {
  it('rejects calls over the hourly limit with Retry-After, then resets after the window', async () => {
    let time = 0;
    const { budget } = createRateLimiters({
      perMinute: 100,
      modelPerMinute: 100,
      modelCallsPerHour: 2,
      now: () => time,
    });
    const app = express();
    app.get('/', budget, (_req, res) => res.json({ ok: true }));
    await request(app).get('/').expect(200);
    await request(app).get('/').expect(200);
    const blocked = await request(app).get('/').expect(503);
    assert.equal(blocked.headers['retry-after'], '3600');
    time = 3_600_000;
    await request(app).get('/').expect(200);
  });
});

describe('logger', () => {
  it('writes one JSON line per entry, info to stdout and problems to stderr', () => {
    const lines = { out: [], err: [] };
    const realOut = process.stdout.write;
    const realErr = process.stderr.write;
    process.stdout.write = (chunk) => (lines.out.push(String(chunk)), true);
    process.stderr.write = (chunk) => (lines.err.push(String(chunk)), true);
    try {
      logger.info('hello', { port: 1 });
      logger.warn('careful');
      writeLog({ severity: 'ERROR', message: 'bad' });
    } finally {
      process.stdout.write = realOut;
      process.stderr.write = realErr;
    }
    assert.deepEqual(JSON.parse(lines.out[0]), { port: 1, severity: 'INFO', message: 'hello' });
    assert.equal(JSON.parse(lines.err[0]).severity, 'WARNING');
    assert.equal(JSON.parse(lines.err[1]).message, 'bad');
  });
});
