/** Runtime configuration, read once from the environment. */
export const config = Object.freeze({
  port: Number(process.env.PORT) || 8080,
  project: process.env.GOOGLE_CLOUD_PROJECT || '',
  vertexLocation: process.env.VERTEX_LOCATION || 'global',
  model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  mapsApiKey: process.env.MAPS_API_KEY || '',
});
