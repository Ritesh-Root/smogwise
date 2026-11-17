/** Thin client for the SmogWise API. Every function rejects with an Error whose message is safe to show. */
async function request(path, body) {
  let response;
  try {
    response = await fetch(`/api/${path}`, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : undefined);
  } catch {
    throw new Error('We could not reach SmogWise. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const findPlace = (query) => request(`location?q=${encodeURIComponent(query)}`);
export const reversePlace = (lat, lng) => request(`location?lat=${lat}&lng=${lng}`);
export const createPlan = (planRequest) => request('plan', planRequest);
export const askQuestion = (planRequest, question, history) =>
  request('chat', { ...planRequest, question, history: history.slice(-8) });
