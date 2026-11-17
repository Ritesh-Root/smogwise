import { describe, expect, it } from 'vitest';
import { badness, planToText } from '../format.js';
import { PLAN_RESPONSE } from './fixtures.js';

describe('badness', () => {
  it('uses the index directly when higher is worse', () => {
    expect(badness({ aqi: 211, higherIsWorse: true })).toBe(211);
  });
  it('inverts the universal index where higher is cleaner', () => {
    expect(badness({ aqi: 80, higherIsWorse: false })).toBe(20);
  });
});

describe('planToText', () => {
  const text = planToText(PLAN_RESPONSE);
  it('leads with the place and the air quality', () => {
    expect(text.split('\n').slice(0, 2)).toEqual([
      'SmogWise plan for Anand Vihar, Delhi, India',
      'Air now: Poor (NAQI (IN) 211)',
    ]);
  });
  it('includes alerts, routine, indoor tips and swaps with their impact', () => {
    expect(text).toContain('- Keep children indoors this morning.');
    expect(text).toContain('- 3 pm: Walk to the park (AQI is 52% lower than at peak)');
    expect(text).toContain('- Wet-mop floors [Free] (Removes settled dust)');
    expect(text).toContain('- Take the metro (Saves 16.8 kg of CO2 a week)');
  });
  it('omits the alerts section when there are none', () => {
    const quiet = planToText({ ...PLAN_RESPONSE, plan: { ...PLAN_RESPONSE.plan, alerts: [] } });
    expect(quiet).not.toContain('Alerts:');
  });
});
