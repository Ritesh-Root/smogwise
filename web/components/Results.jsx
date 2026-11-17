import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { VStack } from '@astryxdesign/core/VStack';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { planToText } from '../format.js';
import { AirNow } from './AirNow.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { ForecastChart } from './ForecastChart.jsx';
import { ImpactView } from './ImpactView.jsx';
import { PlanView } from './PlanView.jsx';

// The chat (and its Markdown renderer) is loaded when the results appear but kept out of the first screen's bundle.
const Chat = lazy(() => import('./Chat.jsx').then((module) => ({ default: module.Chat })));

/**
 * Everything shown after a plan is built. Loaded lazily so the first paint only carries the form.
 * @param {{
 *   result: import('../types.js').PlanResult,
 *   planRequest: import('../types.js').PlanRequest,
 *   announce: import('../types.js').Announce,
 * }} props
 */
export default function Results({ result, planRequest, announce }) {
  const containerRef = useRef(null);
  const language = planRequest.profile.language;

  // Move focus here once this lazy chunk has mounted, so keyboard and screen reader users land on the plan.
  useEffect(() => {
    containerRef.current?.focus();
  }, [result]);

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(planToText(result, language));
      announce('Plan copied. Paste it into your family or community group.');
    } catch {
      announce('Copying is not available in this browser. Select the text instead.');
    }
  }

  return (
    <VStack ref={containerRef} tabIndex={-1} role="region" aria-label="Your clean-air plan" gap={5} className="results">
      <AirNow location={result.location} air={result.air} groupAdvice={result.groupAdvice} language={language} />
      <PlanView plan={result.plan} language={language} />
      <ImpactView commute={result.impact.commute} outdoor={result.impact.outdoor} />
      <ForecastChart forecast={result.air.forecast} />
      <HStack>
        <Button label="Copy plan to share" variant="secondary" onClick={copyPlan} />
      </HStack>
      <ErrorBoundary resetKey={planRequest} message="The chat could not load. Reload the page to try again.">
        <Suspense
          fallback={
            <VStack role="status">
              <Spinner label="Loading chat..." />
            </VStack>
          }
        >
          <Chat key={`${planRequest.lat},${planRequest.lng}`} planRequest={planRequest} />
        </Suspense>
      </ErrorBoundary>
    </VStack>
  );
}
