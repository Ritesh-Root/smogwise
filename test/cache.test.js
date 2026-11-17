import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../src/services/cache.js';

test('entries expire after the ttl', () => {
  let now = 0;
  const cache = new TtlCache({ ttlMs: 100, max: 10, now: () => now });
  cache.set('a', 1);
  now = 99;
  assert.equal(cache.get('a'), 1);
  now = 100;
  assert.equal(cache.get('a'), undefined);
});

test('the oldest entry is evicted at capacity', () => {
  const cache = new TtlCache({ ttlMs: 1000, max: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

test('getOrCompute shares one computation between concurrent callers', async () => {
  const cache = new TtlCache({ ttlMs: 1000, max: 10 });
  let runs = 0;
  const compute = async () => ++runs;
  const results = await Promise.all([cache.getOrCompute('k', compute), cache.getOrCompute('k', compute)]);
  assert.deepEqual(results, [1, 1]);
});

test('getOrCompute does not cache failures', async () => {
  const cache = new TtlCache({ ttlMs: 1000, max: 10 });
  await assert.rejects(cache.getOrCompute('k', async () => { throw new Error('boom'); }), /boom/);
  assert.equal(await cache.getOrCompute('k', async () => 'ok'), 'ok');
});
