import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError, UpstreamError } from '../../src/errors.js';
import { createAssistant } from '../../src/services/assistant.js';
import { CONTEXT, PLAN } from '../helpers.js';

const NOW = new Date('2026-11-18T05:00:00Z');
const fakeAi = (text) => {
  const calls = [];
  return { calls, models: { generateContent: async (request) => (calls.push(request), { text }) } };
};
const assistant = (ai) => createAssistant({ ai, model: 'test-model', now: () => NOW });

describe('assistant: plan', () => {
  it('requests schema-constrained JSON, grounded in the context, with safety settings and a timeout', async () => {
    const ai = fakeAi(JSON.stringify(PLAN));
    assert.deepEqual(await assistant(ai).generatePlan(CONTEXT), PLAN);
    const [request] = ai.calls;
    assert.equal(request.model, 'test-model');
    assert.equal(request.config.responseMimeType, 'application/json');
    assert.ok(request.config.responseSchema);
    assert.equal(request.config.safetySettings.length, 4);
    assert.ok(request.config.abortSignal instanceof AbortSignal);
    assert.match(request.config.systemInstruction, /"aqi":312/);
    assert.match(request.config.systemInstruction, /Write in English/);
  });

  it('rejects malformed, incomplete or empty plans with a 502', async () => {
    for (const text of ['not json', JSON.stringify({ summary: 'only this' }), '']) {
      await assert.rejects(
        assistant(fakeAi(text)).generatePlan(CONTEXT),
        (error) => error instanceof HttpError && error.status === 502,
      );
    }
  });

  it('wraps a failed model call as an UpstreamError that keeps the cause', async () => {
    const failing = {
      models: {
        generateContent: async () => {
          throw new Error('quota exceeded');
        },
      },
    };
    await assert.rejects(assistant(failing).generatePlan(CONTEXT), (error) => {
      assert.ok(error instanceof UpstreamError);
      assert.match(String(error.cause), /quota exceeded/);
      return true;
    });
  });
});

describe('assistant: chat', () => {
  it('sends the history then the question, and answers in the household language', async () => {
    const ai = fakeAi('Wait until 3 pm.');
    const context = { ...CONTEXT, profile: { ...CONTEXT.profile, language: 'hi' } };
    const answer = await assistant(ai).answer(context, 'When can we walk?', [
      { role: 'user', text: 'Hi' },
      { role: 'model', text: 'Hello' },
    ]);
    assert.equal(answer, 'Wait until 3 pm.');
    assert.deepEqual(
      ai.calls[0].contents.map((c) => [c.role, c.parts[0].text]),
      [
        ['user', 'Hi'],
        ['model', 'Hello'],
        ['user', 'When can we walk?'],
      ],
    );
    assert.match(ai.calls[0].config.systemInstruction, /Write in Hindi/);
  });
});
