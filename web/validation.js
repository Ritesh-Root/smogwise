import { LIMITS } from './constants.js';

/**
 * Checks run in the browser before anything is sent. The server validates again; this exists so
 * people see a friendly message next to the field instead of an API error. The number fields need
 * no check here: the design system's NumberInput keeps them within range and whole.
 */

/** @param {string} text */
export const validatePlace = (text) =>
  text.trim().length < LIMITS.placeQueryMin ? 'Enter your city or neighbourhood.' : '';
