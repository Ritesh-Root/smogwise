import { HttpError } from '../errors.js';
import { PLAN_REQUEST, PLAN_RESPONSE_SCHEMA, systemInstruction } from '../prompt.js';
import { planSchema } from '../validation.js';

const SAFETY_SETTINGS = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_MEDIUM_AND_ABOVE' }));

/**
 * Gemini (Vertex AI) wrapper for the two things the app asks the model to do.
 * @param {{ai: {models: {generateContent: Function}}, model: string}} options
 */
export function createAssistant({ ai, model }) {
  async function generate(context, contents, extraConfig) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemInstruction(context),
        temperature: 0.4,
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingLevel: 'LOW' },
        ...extraConfig,
      },
    });
    if (!response.text) throw new HttpError(502, 'The assistant could not answer that. Please rephrase and try again.');
    return response.text;
  }

  return {
    /** @param {object} context @returns {Promise<import('zod').infer<typeof planSchema>>} */
    async generatePlan(context) {
      const raw = await generate(context, [{ role: 'user', parts: [{ text: PLAN_REQUEST }] }], {
        responseMimeType: 'application/json',
        responseSchema: PLAN_RESPONSE_SCHEMA,
        maxOutputTokens: 4096,
      });
      let parsed;
      try {
        parsed = planSchema.safeParse(JSON.parse(raw));
      } catch {
        parsed = { success: false };
      }
      if (!parsed.success) throw new HttpError(502, 'The assistant returned an incomplete plan. Please try again.');
      return parsed.data;
    },

    /**
     * @param {object} context
     * @param {string} question
     * @param {Array<{role: 'user' | 'model', text: string}>} history
     * @returns {Promise<string>}
     */
    answer(context, question, history) {
      const contents = [...history, { role: 'user', text: question }].map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      }));
      return generate(context, contents, { maxOutputTokens: 1024 });
    },
  };
}
