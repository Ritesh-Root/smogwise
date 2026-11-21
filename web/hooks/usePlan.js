import { useState } from 'react';
import { createPlan } from '../api.js';

/**
 * Building a plan: look up the place, ask the server, and keep the result and any failure.
 * @param {{
 *   resolvePlace: () => Promise<import('../types.js').ResolvedPlace | null>,
 *   profile: import('../types.js').Profile,
 *   announce: import('../types.js').Announce,
 * }} options
 */
export function usePlan({ resolvePlace, profile, announce }) {
  /** @type {[import('../types.js').PlanResult | null, Function]} */
  const [result, setResult] = useState(null);
  /** @type {[import('../types.js').PlanRequest | null, Function]} */
  const [planRequest, setPlanRequest] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [failure, setFailure] = useState('');

  async function build() {
    setFailure('');
    setIsPlanning(true);
    try {
      const place = await resolvePlace();
      if (!place) return;
      announce('Checking the air and building your plan. This usually takes about ten seconds...');
      /** @type {import('../types.js').PlanRequest} */
      const request = {
        lat: place.lat,
        lng: place.lng,
        label: place.label,
        utcOffsetMinutes: -new Date().getTimezoneOffset(),
        profile,
      };
      const data = await createPlan(request);
      setPlanRequest(request);
      setResult(data);
      announce('Your plan is ready.');
    } catch (error) {
      announce('');
      setFailure(error.message);
    } finally {
      setIsPlanning(false);
    }
  }

  return { result, planRequest, isPlanning, failure, build };
}
