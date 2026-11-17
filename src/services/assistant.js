// @ts-check
import {
  CHAT_MAX_OUTPUT_TOKENS,
  MODEL_ATTEMPTS,
  MODEL_TIMEOUT_MS,
  PLAN_MAX_OUTPUT_TOKENS,
  TEMPERATURE,
} from '../constants.js';
import { HttpError, UpstreamError } from '../errors.js';
import { PLAN_PROMPT, systemInstruction } from '../prompt.js';
import { PLAN_RESPONSE_SCHEMA, planSchema } from '../plan.js';

const SAFETY_SETTINGS = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' }));

/** @param {unknown} error */
const isTimeout = (error) => error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

/**
 * Run a model request, trying again only when an attempt timed out: a slow call usually succeeds on a fresh
 * attempt, while any other failure (quota, bad request) would just fail again and cost more.
 * @template T
 * @param {() => Promise<T>} request
 * @param {number} attempts
 * @returns {Promise<T>}
 */
async function withRetryOnTimeout(request, attempts) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await request();
    } catch (cause) {
      if (attempt >= attempts || !isTimeout(cause)) throw new UpstreamError('Gemini request failed', { cause });
    }
  }
}

/**
 * Gemini (Vertex AI) wrapper for the two things the app asks the model to do.
 * @param {{ai: import('../types.js').GenerativeClient, model: string, now?: () => Date}} options
 * @returns {import('../types.js').Assistant}
 */
export function createAssistant({ ai, model, now = () => new Date() }) {
  /**
   * @param {import('../types.js').PlanContext} context
   * @param {Array<{role: string, parts: Array<{text: string}>}>} contents
   * @param {Record<string, unknown>} extraConfig
   */
  async function generate(context, contents, extraConfig) {
    const request = () =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction(context, now()),
          temperature: TEMPERATURE,
          safetySettings: SAFETY_SETTINGS,
          thinkingConfig: { thinkingLevel: 'LOW' },
          abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
          ...extraConfig,
        },
      });
    const response = await withRetryOnTimeout(request, MODEL_ATTEMPTS);
    if (!response.text) throw new HttpError(502, 'The assistant could not answer that. Please rephrase and try again.');
    return response.text;
  }

  return {
    async generatePlan(context) {
      const raw = await generate(context, [{ role: 'user', parts: [{ text: PLAN_PROMPT }] }], {
        responseMimeType: 'application/json',
        responseSchema: PLAN_RESPONSE_SCHEMA,
        maxOutputTokens: PLAN_MAX_OUTPUT_TOKENS,
      });
      let parsed;
      try {
        parsed = planSchema.safeParse(JSON.parse(raw));
      } catch {
        parsed = { success: false };
      }
      if (!parsed.success || !parsed.data) {
        throw new HttpError(502, 'The assistant returned an incomplete plan. Please try again.');
      }
      return parsed.data;
    },

    answer(context, question, history) {
      const contents = [...history, { role: 'user', text: question }].map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      }));
      return generate(context, contents, { maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS });
    },
  };
}
