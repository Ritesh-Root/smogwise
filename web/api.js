import { COORDINATE_DECIMALS, LIMITS, REQUEST_TIMEOUT_MS } from './constants.js';

/**
 * Call the SmogWise API. Rejects with an Error whose message is safe to show to the user.
 * @param {string} path
 * @param {object} [body] JSON body; when present the call is a POST
 */
async function request(path, body) {
  const options = { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
  if (body) {
    Object.assign(options, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  let response;
  try {
    response = await fetch(`/api/${path}`, options);
  } catch (error) {
    throw new Error(
      error?.name === 'TimeoutError'
        ? 'This is taking longer than expected. Please try again.'
        : 'We could not reach SmogWise. Check your connection and try again.',
      { cause: error },
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

/**
 * @param {string} query
 * @returns {Promise<import('./types.js').Place>}
 */
export const findPlace = (query) => request(`location?q=${encodeURIComponent(query)}`);

/**
 * Coordinates are rounded to about 1 km before they leave the browser, so precise positions never
 * appear in request URLs or server logs. Air quality is looked up per ~1 km cell anyway.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<import('./types.js').Place>}
 */
export const reversePlace = (lat, lng) =>
  request(`location?lat=${lat.toFixed(COORDINATE_DECIMALS)}&lng=${lng.toFixed(COORDINATE_DECIMALS)}`);

/**
 * @param {import('./types.js').PlanRequest} planRequest
 * @returns {Promise<import('./types.js').PlanResult>}
 */
export const createPlan = (planRequest) => request('plan', planRequest);

/**
 * @param {import('./types.js').PlanRequest} planRequest
 * @param {string} question
 * @param {import('./types.js').ChatTurn[]} history earlier turns; only the most recent ones the server accepts are sent
 * @returns {Promise<{answer: string}>}
 */
export const askQuestion = (planRequest, question, history) =>
  request('chat', {
    ...planRequest,
    question,
    history: history
      .slice(-LIMITS.historyTurns)
      .map(({ role, text }) => ({ role, text: text.slice(0, LIMITS.historyTextMax) })),
  });
