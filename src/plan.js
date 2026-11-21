// @ts-check
import { z } from 'zod';
import { PLAN_LIMITS } from './constants.js';

const text = z.string().min(1).max(PLAN_LIMITS.text);

/** @param {z.ZodRawShape} shape */
const itemList = (shape) => z.array(z.object(shape)).min(1).max(PLAN_LIMITS.items);

/** Shape the model must return for a plan; anything else is rejected before it reaches the browser. */
export const planSchema = z.object({
  summary: text,
  alerts: z.array(text).max(PLAN_LIMITS.alerts),
  routine: itemList({ time: z.string().min(1).max(PLAN_LIMITS.timeLabel), action: text, impact: text }),
  indoor: itemList({ tip: text, impact: text, cost: z.string().min(1).max(PLAN_LIMITS.cost) }),
  alternatives: itemList({ swap: text, impact: text }),
});

/** @param {string} description */
const stringField = (description) => ({ type: 'STRING', description });

/** @param {Record<string, {type: string, description: string}>} properties */
const objectList = (properties) => ({
  type: 'ARRAY',
  items: { type: 'OBJECT', properties, required: Object.keys(properties) },
});

/**
 * The same shape in Gemini's response-schema format, so the model is constrained while it writes.
 * A test checks that its field names match `planSchema`.
 */
export const PLAN_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['summary', 'alerts', 'routine', 'indoor', 'alternatives'],
  properties: {
    summary: stringField("Two sentences on today's air and what matters most for this household."),
    alerts: { type: 'ARRAY', items: stringField('Urgent warning; empty list when none.') },
    routine: objectList({
      time: stringField('24-hour local time or range, e.g. "07:00-08:00".'),
      action: stringField('What to do.'),
      impact: stringField('Direct effect on exposure or emissions, with numbers from the context where possible.'),
    }),
    indoor: objectList({
      tip: stringField('Indoor air quality hack.'),
      impact: stringField('What it changes.'),
      cost: stringField('Rough cost in the local currency, e.g. "Free" or a short range.'),
    }),
    alternatives: objectList({
      swap: stringField('Sustainable alternative to a current habit.'),
      impact: stringField('Emissions or exposure difference, using the impact numbers in the context.'),
    }),
  },
};
