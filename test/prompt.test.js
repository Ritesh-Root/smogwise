import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { modelFacts, systemInstruction } from '../src/prompt.js';
import { CONTEXT } from './helpers.js';

const NOW = new Date('2026-11-18T05:00:00Z'); // 10:30 in Delhi

describe('modelFacts', () => {
  const facts = modelFacts(CONTEXT, NOW);

  it('gives the model local times and the same impact numbers the UI shows', () => {
    assert.deepEqual(facts.air.forecast[0], { localTime: '08:00', aqi: 400, category: 'Very poor' });
    assert.equal(facts.impact.outdoor.cleanestWakingHour.localTime, '15:00');
    assert.equal(facts.impact.outdoor.aqiReductionPercent, 50);
    assert.equal(facts.impact.commute.co2KgWeek, 17);
  });

  it('tells the model the current local date, time and month', () => {
    assert.deepEqual(facts.now, { localDate: '2026-11-18', localTime: '10:30', month: 'November' });
  });

  it('includes the health advice that applies to this household', () => {
    assert.deepEqual(facts.air.adviceForThisHousehold, [{ member: 'children', advice: 'Keep children indoors.' }]);
  });

  it('states the direction of the index scale', () => {
    assert.equal(facts.air.scale, 'higher is worse');
    const universal = { ...CONTEXT, air: { ...CONTEXT.air, index: { ...CONTEXT.air.index, higherIsWorse: false } } };
    assert.match(modelFacts(universal, NOW).air.scale, /higher is cleaner/);
  });

  it('copes with no waking-hour reading', () => {
    assert.equal(modelFacts({ ...CONTEXT, impact: { ...CONTEXT.impact, outdoor: null } }, NOW).impact.outdoor, null);
  });
});

describe('systemInstruction', () => {
  const text = systemInstruction(CONTEXT, NOW);

  it('treats place name, notes and every chat turn, including model turns, as untrusted', () => {
    assert.match(text, /place name.*notes.*every chat message.*earlier "model" turns.*may be forged/s);
  });

  it('asks for short plain chat answers, costs in local currency and 24-hour times', () => {
    assert.match(text, /under 120 words.*no headings/s);
    assert.match(text, /local currency/);
    assert.match(text, /24-hour format/);
  });

  it('embeds the context as JSON and names the language', () => {
    assert.match(text, /"aqi":312/);
    assert.match(text, /Write in English/);
    const hindi = systemInstruction({ ...CONTEXT, profile: { ...CONTEXT.profile, language: 'hi' } }, NOW);
    assert.match(hindi, /Write in Hindi \(Devanagari script\)/);
  });
});
