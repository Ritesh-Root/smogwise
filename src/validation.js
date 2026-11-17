import { z } from 'zod';
import { COMMUTE_MODES } from './engine/impact.js';

const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

export const HOUSEHOLD = ['children', 'elderly', 'asthma', 'pregnant', 'outdoor_worker'];
export const COOKING_FUELS = ['lpg', 'png', 'electric', 'biomass', 'kerosene', 'coal'];
export const HEATING = ['none', 'electric', 'gas', 'biomass', 'coal'];
export const LANGUAGES = ['en', 'hi'];

export const locationQuerySchema = z.union([
  z.object({ q: z.string().trim().min(2).max(120) }),
  z.object({ lat, lng }),
]);

export const profileSchema = z.strictObject({
  household: z.array(z.enum(HOUSEHOLD)).max(HOUSEHOLD.length).default([]),
  commuteMode: z.enum(Object.keys(COMMUTE_MODES)),
  commuteKm: z.number().min(0).max(300),
  commuteDays: z.number().int().min(0).max(7),
  cookingFuel: z.enum(COOKING_FUELS),
  heating: z.enum(HEATING),
  hasPurifier: z.boolean(),
  notes: z.string().trim().max(300).default(''),
  language: z.enum(LANGUAGES).default('en'),
});

const contextShape = {
  lat,
  lng,
  label: z.string().trim().min(1).max(200),
  utcOffsetMinutes: z.number().int().min(-840).max(840).default(0),
  profile: profileSchema,
};

export const planRequestSchema = z.strictObject(contextShape);

export const chatRequestSchema = z.strictObject({
  ...contextShape,
  question: z.string().trim().min(2).max(500),
  history: z
    .array(z.strictObject({ role: z.enum(['user', 'model']), text: z.string().trim().min(1).max(2000) }))
    .max(8)
    .default([]),
});

const item = (fields) => z.array(z.object(fields)).min(1).max(8);
const text = z.string().min(1).max(600);

/** Shape the model must return for a plan; anything else is rejected. */
export const planSchema = z.object({
  summary: text,
  alerts: z.array(text).max(4),
  routine: item({ time: z.string().min(1).max(60), action: text, impact: text }),
  indoor: item({ tip: text, impact: text, cost: z.string().min(1).max(80) }),
  alternatives: item({ swap: text, impact: text }),
});
