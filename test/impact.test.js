import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commuteImpact, outdoorWindows, severity } from '../src/engine/impact.js';
import { CPCB, SNAPSHOT } from './helpers.js';

test('commuteImpact computes weekly emissions for the current mode', () => {
  const impact = commuteImpact({ commuteMode: 'car_petrol', commuteKm: 20, commuteDays: 5 });
  assert.equal(impact.weeklyKm, 100);
  assert.equal(impact.co2KgWeek, 17);
  assert.equal(impact.pm25GWeek, 1);
});

test('commuteImpact ranks cleaner alternatives by CO2 saved', () => {
  const { alternatives } = commuteImpact({ commuteMode: 'car_petrol', commuteKm: 20, commuteDays: 5 });
  assert.equal(alternatives[0].mode, 'walk_cycle');
  assert.deepEqual(
    alternatives.map((a) => a.co2SavedKgWeek),
    [...alternatives.map((a) => a.co2SavedKgWeek)].sort((a, b) => b - a),
  );
  const metro = alternatives.find((a) => a.mode === 'metro');
  assert.equal(metro.co2SavedKgWeek, 14);
  assert.equal(metro.co2SavedKgYear, 728);
  assert.equal(metro.co2SavedPercent, 82);
});

test('commuteImpact never suggests a mode that emits more particles', () => {
  const { alternatives } = commuteImpact({ commuteMode: 'car_petrol', commuteKm: 10, commuteDays: 5 });
  assert.ok(!alternatives.some((a) => a.mode === 'two_wheeler'));
});

test('commuteImpact offers no alternatives to the cleanest mode or a zero-distance commute', () => {
  assert.deepEqual(commuteImpact({ commuteMode: 'walk_cycle', commuteKm: 5, commuteDays: 5 }).alternatives, []);
  assert.deepEqual(commuteImpact({ commuteMode: 'car_diesel', commuteKm: 0, commuteDays: 5 }).alternatives, []);
});

test('severity uses CPCB, EPA and universal breakpoints', () => {
  assert.equal(severity(CPCB(40)), 0);
  assert.equal(severity(CPCB(200)), 2);
  assert.equal(severity(CPCB(312)), 4);
  assert.equal(severity(CPCB(480)), 5);
  assert.equal(severity({ code: 'usa_epa', aqi: 160, higherIsWorse: true }), 3);
  assert.equal(severity({ code: 'unknown_local', aqi: 40, higherIsWorse: true }), 0);
  assert.equal(severity({ code: 'uaqi', aqi: 95, higherIsWorse: false }), 0);
  assert.equal(severity({ code: 'uaqi', aqi: 10, higherIsWorse: false }), 4);
  assert.equal(severity({ code: 'uaqi', aqi: 0, higherIsWorse: false }), 5);
});

test('outdoorWindows picks best and worst waking hours in local time', () => {
  const windows = outdoorWindows(SNAPSHOT.forecast, 330);
  assert.equal(windows.best.aqi, 200); // the 02:00 reading is cleaner but everyone is asleep
  assert.equal(windows.worst.aqi, 400);
  assert.equal(windows.reductionPercent, 50);
});

test('outdoorWindows handles the universal index, where higher is cleaner', () => {
  const uaqi = (aqi) => ({ code: 'uaqi', aqi, category: '', higherIsWorse: false });
  const windows = outdoorWindows([
    { time: '2026-11-18T10:00:00Z', index: uaqi(80) },
    { time: '2026-11-18T12:00:00Z', index: uaqi(40) },
  ]);
  assert.equal(windows.best.aqi, 80);
  assert.equal(windows.worst.aqi, 40);
});

test('outdoorWindows returns null without waking-hour data and 0% when air is perfect', () => {
  assert.equal(outdoorWindows([]), null);
  assert.equal(outdoorWindows([{ time: '2026-11-18T02:00:00Z', index: CPCB(90) }]), null);
  assert.equal(outdoorWindows([{ time: '2026-11-18T10:00:00Z', index: CPCB(0) }]).reductionPercent, 0);
});
