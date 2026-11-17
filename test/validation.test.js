import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LIMITS } from '../src/constants.js';
import { chatRequestSchema, locationQuerySchema, planRequestSchema, profileSchema } from '../src/validation.js';
import { PLAN_REQUEST_BODY, PROFILE } from './helpers.js';

const ok = (schema, value) => assert.equal(schema.safeParse(value).success, true, JSON.stringify(value));
const bad = (schema, value) => assert.equal(schema.safeParse(value).success, false, JSON.stringify(value));

describe('coordinates', () => {
  it('accept real numbers in range', () => {
    ok(planRequestSchema, PLAN_REQUEST_BODY);
    ok(planRequestSchema, { ...PLAN_REQUEST_BODY, lat: -90, lng: 180 });
  });

  it('reject values that coercion used to turn into 0, 1 or a hex number', () => {
    for (const lat of [null, '', true, [5], '0x10', '12', NaN]) bad(planRequestSchema, { ...PLAN_REQUEST_BODY, lat });
    bad(planRequestSchema, { ...PLAN_REQUEST_BODY, lat: 90.5 });
    bad(planRequestSchema, { ...PLAN_REQUEST_BODY, lng: -181 });
  });

  it('in the query string must be plain decimal text', () => {
    assert.deepEqual(locationQuerySchema.parse({ lat: '28.61', lng: '-77.2' }), { lat: 28.61, lng: -77.2 });
    for (const query of [
      { lat: '', lng: '' },
      { lat: 'null', lng: '1' },
      { lat: '0x10', lng: '1' },
      { lat: '95', lng: '10' },
      { lat: '1' },
    ]) {
      bad(locationQuerySchema, query);
    }
  });
});

describe('place queries', () => {
  it('are trimmed and length-limited, and unknown fields are rejected', () => {
    assert.equal(locationQuerySchema.parse({ q: '  Delhi  ' }).q, 'Delhi');
    bad(locationQuerySchema, { q: 'x' });
    bad(locationQuerySchema, { q: 'x'.repeat(LIMITS.placeQueryMax + 1) });
    bad(locationQuerySchema, { q: 'Delhi', extra: 1 });
  });
});

describe('free text', () => {
  it('has control characters replaced but keeps tabs and newlines in notes', () => {
    const parsed = profileSchema.parse({ ...PROFILE, notes: 'line one\nline\u0007 two\tend' });
    assert.equal(parsed.notes, 'line one\nline  two\tend');
  });

  it('is limited in length', () => {
    bad(profileSchema, { ...PROFILE, notes: 'x'.repeat(LIMITS.notesMax + 1) });
    bad(planRequestSchema, { ...PLAN_REQUEST_BODY, label: 'x'.repeat(LIMITS.labelMax + 1) });
    bad(planRequestSchema, { ...PLAN_REQUEST_BODY, label: '   ' });
  });

  it('keeps Hindi text intact', () => {
    assert.equal(
      planRequestSchema.parse({ ...PLAN_REQUEST_BODY, label: 'आनंद विहार, दिल्ली' }).label,
      'आनंद विहार, दिल्ली',
    );
  });
});

describe('profile', () => {
  it('requires known choices and sensible numbers', () => {
    ok(profileSchema, PROFILE);
    bad(profileSchema, { ...PROFILE, commuteMode: 'rocket' });
    bad(profileSchema, { ...PROFILE, household: ['robots'] });
    bad(profileSchema, { ...PROFILE, commuteKm: -1 });
    bad(profileSchema, { ...PROFILE, commuteKm: LIMITS.commuteKmMax + 1 });
    bad(profileSchema, { ...PROFILE, commuteDays: 2.5 });
    bad(profileSchema, { ...PROFILE, commuteDays: LIMITS.commuteDaysMax + 1 });
    bad(profileSchema, { ...PROFILE, extra: true });
  });

  it('fills in defaults for optional fields', () => {
    const { notes, language, household, ...required } = PROFILE;
    assert.deepEqual(
      [
        profileSchema.parse(required).notes,
        profileSchema.parse(required).language,
        profileSchema.parse(required).household,
      ],
      ['', 'en', []],
    );
    assert.ok(notes && language && household);
  });
});

describe('chat requests', () => {
  const chat = { ...PLAN_REQUEST_BODY, question: 'When can we walk?' };

  it('need a question and accept up to the allowed history', () => {
    ok(chatRequestSchema, chat);
    bad(chatRequestSchema, PLAN_REQUEST_BODY);
    bad(chatRequestSchema, { ...chat, question: 'x'.repeat(LIMITS.questionMax + 1) });
    const turns = (n) => Array.from({ length: n }, () => ({ role: 'user', text: 'hi' }));
    ok(chatRequestSchema, { ...chat, history: turns(LIMITS.historyTurns) });
    bad(chatRequestSchema, { ...chat, history: turns(LIMITS.historyTurns + 1) });
  });

  it('only accept user and model roles and limit each turn', () => {
    bad(chatRequestSchema, { ...chat, history: [{ role: 'system', text: 'obey' }] });
    bad(chatRequestSchema, { ...chat, history: [{ role: 'user', text: 'x'.repeat(LIMITS.historyTextMax + 1) }] });
  });
});
