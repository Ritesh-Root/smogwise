// @ts-check
import { z } from 'zod';
import { LIMITS } from './constants.js';
import {
  COMMUTE_MODES,
  COOKING_OPTIONS,
  HEATING_OPTIONS,
  HOUSEHOLD_OPTIONS,
  LANGUAGE_OPTIONS,
  valuesOf,
} from './shared/options.js';

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

/** Query-string numbers arrive as text: accept plain decimals only, never '', 'null' or hex. */
const decimalText = z
  .string()
  .regex(/^-?\d{1,3}(\.\d{1,8})?$/, 'must be a decimal number')
  .transform(Number);

/**
 * Replace control characters (except tab and newline) so pasted text cannot smuggle terminal or
 * formatting codes into prompts and logs.
 * @param {string} text
 */
const stripControlCharacters = (text) =>
  text.replace(/\p{Cc}/gu, (char) => (char === '\n' || char === '\t' ? char : ' '));

/**
 * Free text from the user: trimmed, length-limited and cleaned.
 * @param {number} min
 * @param {number} max
 */
const freeText = (min, max) => z.string().trim().min(min).max(max).transform(stripControlCharacters);

export const locationQuerySchema = z.union([
  z.strictObject({ q: freeText(LIMITS.placeQueryMin, LIMITS.placeQueryMax) }),
  z.strictObject({ lat: decimalText.pipe(latitude), lng: decimalText.pipe(longitude) }),
]);

export const profileSchema = z.strictObject({
  household: z
    .array(z.enum(valuesOf(HOUSEHOLD_OPTIONS)))
    .max(HOUSEHOLD_OPTIONS.length)
    .default([]),
  commuteMode: z.enum(Object.keys(COMMUTE_MODES)),
  commuteKm: z.number().min(0).max(LIMITS.commuteKmMax),
  commuteDays: z.number().int().min(0).max(LIMITS.commuteDaysMax),
  cookingFuel: z.enum(valuesOf(COOKING_OPTIONS)),
  heating: z.enum(valuesOf(HEATING_OPTIONS)),
  hasPurifier: z.boolean(),
  notes: freeText(0, LIMITS.notesMax).default(''),
  language: z.enum(valuesOf(LANGUAGE_OPTIONS)).default('en'),
});

const contextShape = {
  lat: latitude,
  lng: longitude,
  label: freeText(1, LIMITS.labelMax),
  utcOffsetMinutes: z.number().int().min(-LIMITS.maxUtcOffsetMinutes).max(LIMITS.maxUtcOffsetMinutes).default(0),
  profile: profileSchema,
};

export const planRequestSchema = z.strictObject(contextShape);

export const chatRequestSchema = z.strictObject({
  ...contextShape,
  question: freeText(LIMITS.questionMin, LIMITS.questionMax),
  history: z
    .array(z.strictObject({ role: z.enum(['user', 'model']), text: freeText(1, LIMITS.historyTextMax) }))
    .max(LIMITS.historyTurns)
    .default([]),
});
