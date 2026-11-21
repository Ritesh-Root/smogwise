import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PLAN_RESPONSE_SCHEMA, planSchema } from '../src/plan.js';
import { PLAN } from './helpers.js';

describe('plan schemas', () => {
  it('the zod schema and the Gemini response schema describe the same fields', () => {
    assert.deepEqual(Object.keys(PLAN_RESPONSE_SCHEMA.properties).sort(), Object.keys(planSchema.shape).sort());
    for (const section of ['routine', 'indoor', 'alternatives']) {
      assert.deepEqual(
        Object.keys(PLAN_RESPONSE_SCHEMA.properties[section].items.properties).sort(),
        Object.keys(planSchema.shape[section].element.shape).sort(),
        section,
      );
      assert.deepEqual(
        PLAN_RESPONSE_SCHEMA.properties[section].items.required.sort(),
        Object.keys(planSchema.shape[section].element.shape).sort(),
      );
    }
  });

  it('accepts a complete plan and rejects missing sections or oversized text', () => {
    assert.equal(planSchema.safeParse(PLAN).success, true);
    assert.equal(planSchema.safeParse({ ...PLAN, routine: [] }).success, false);
    assert.equal(planSchema.safeParse({ ...PLAN, summary: 'x'.repeat(601) }).success, false);
  });
});
