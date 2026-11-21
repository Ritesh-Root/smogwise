// @ts-check
import { z } from 'zod';

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  MAPS_API_KEY: z.string().min(1),
  VERTEX_LOCATION: z.string().min(1).default('global'),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
});

/**
 * Read and validate configuration from the environment, failing with one message that lists every problem.
 * @param {Record<string, string | undefined>} [env]
 */
export function loadConfig(env = process.env) {
  const result = environmentSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid configuration. ${problems.join('; ')}`);
  }
  const values = result.data;
  return Object.freeze({
    port: values.PORT,
    project: values.GOOGLE_CLOUD_PROJECT,
    mapsApiKey: values.MAPS_API_KEY,
    vertexLocation: values.VERTEX_LOCATION,
    model: values.GEMINI_MODEL,
  });
}
