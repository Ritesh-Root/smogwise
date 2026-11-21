import { useState } from 'react';
import { findPlace, reversePlace } from '../api.js';
import { GEOLOCATION_OPTIONS } from '../constants.js';
import { validatePlace } from '../validation.js';

/**
 * The place the household lives: the text in the field, its validation message, and the looked-up
 * coordinates. The lookup is remembered so the same text is not geocoded twice.
 * @param {import('../types.js').Announce} announce
 */
export function usePlace(announce) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  /** @type {[import('../types.js').ResolvedPlace | null, Function]} */
  const [place, setPlace] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  /** @param {string} value */
  function onChange(value) {
    setText(value);
    setError('');
    if (place && place.typed !== value.trim()) setPlace(null);
  }

  /** Check the field when the user leaves it, but only once they have typed something. */
  function onBlur() {
    if (text.length > 0) setError(validatePlace(text));
  }

  /** Check the field and show the message. Returns the message, or '' when the place is valid. */
  function validate() {
    const message = validatePlace(text);
    setError(message);
    return message;
  }

  /**
   * Coordinates for the typed place, from memory or the geocoder. Returns null (and shows why next
   * to the field) when the place cannot be found.
   * @returns {Promise<import('../types.js').ResolvedPlace | null>}
   */
  async function resolve() {
    const typed = text.trim();
    if (place && place.typed === typed) return place;
    announce('Finding your location...');
    try {
      const found = { ...(await findPlace(typed)), typed };
      setPlace(found);
      return found;
    } catch (failure) {
      announce('');
      setError(failure.message);
      return null;
    }
  }

  /** Fill the field from the browser's location. */
  function locate() {
    setError('');
    if (!navigator.geolocation) {
      setError('Your browser cannot share location. Type your city instead.');
      return;
    }
    setIsLocating(true);
    announce('Asking your browser for your location...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const found = await reversePlace(coords.latitude, coords.longitude);
          setText(found.label);
          setPlace({ ...found, typed: found.label });
          announce(`Location set to ${found.label}.`);
        } catch (failure) {
          announce('');
          setError(failure.message);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        announce('');
        setError('We could not get your location. Type your city instead.');
      },
      GEOLOCATION_OPTIONS,
    );
  }

  return { text, error, isLocating, onChange, onBlur, validate, resolve, locate };
}
