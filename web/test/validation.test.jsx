import { describe, expect, it } from 'vitest';
import { validatePlace } from '../validation.js';

describe('validatePlace', () => {
  it('asks for at least two characters', () => {
    expect(validatePlace('')).toMatch(/Enter your city/);
    expect(validatePlace(' a ')).toMatch(/Enter your city/);
    expect(validatePlace('Delhi')).toBe('');
  });
});
