import { describe, expect, it } from 'vitest';
import { badness, planToText, severityClass, summariseForecast } from '../format.js';
import { STRINGS, stringsFor } from '../strings.js';
import { PLAN_RESPONSE } from './fixtures.js';

describe('badness', () => {
  it('uses the index directly when higher is worse', () => {
    expect(badness({ aqi: 211, higherIsWorse: true })).toBe(211);
  });
  it('inverts the universal index where higher is cleaner', () => {
    expect(badness({ aqi: 80, higherIsWorse: false })).toBe(20);
  });
});

describe('severityClass', () => {
  it('names the colour class for a level', () => {
    expect(severityClass(3)).toBe('sev-3');
  });
});

describe('summariseForecast', () => {
  const summary = summariseForecast(PLAN_RESPONSE.air.forecast);
  it('finds the scale for the tallest bar', () => {
    expect(summary.worstBadness).toBe(250);
  });
  it('describes the cleanest and most polluted hours', () => {
    expect(summary.summary).toMatch(/next 3 hours.*Cleanest at .*\(AQI 120\).*most polluted at .*\(AQI 250\)/);
  });
  it('builds one table row per hour', () => {
    expect(summary.rows).toHaveLength(3);
    expect(summary.rows[1]).toMatchObject({ aqi: 120, category: 'Moderate air quality' });
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
    expect(text).toContain('- 15:00: Walk to the park (AQI is 52% lower than at peak)');
    expect(text).toContain('- Wet-mop floors [Free] (Removes settled dust)');
    expect(text).toContain('- Take the metro (Saves 16.8 kg of CO2 a week)');
  });

  it('omits the alerts section when there are none', () => {
    expect(planToText({ ...PLAN_RESPONSE, plan: { ...PLAN_RESPONSE.plan, alerts: [] } })).not.toContain('Alerts:');
  });

  it('uses Hindi headings for a Hindi plan', () => {
    const hindi = planToText(PLAN_RESPONSE, 'hi');
    expect(hindi).toContain(`${STRINGS.hi.routine}:`);
    expect(hindi).not.toContain('Daily routine:');
  });
});

describe('stringsFor', () => {
  it('falls back to English for an unknown language', () => {
    expect(stringsFor('fr')).toBe(STRINGS.en);
  });
  it('has a translation for every English string', () => {
    expect(Object.keys(STRINGS.hi).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });
});
