import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { VStack } from '@astryxdesign/core/VStack';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { AirNow } from './AirNow.jsx';
import { ForecastChart } from './ForecastChart.jsx';
import { ImpactView } from './ImpactView.jsx';
import { PlanView } from './PlanView.jsx';

// The chat (and its Markdown renderer) is only needed once a question is asked, so it loads on demand.
const Chat = lazy(() => import('./Chat.jsx').then((m) => ({ default: m.Chat })));

/** Everything shown after a plan is built. Loaded lazily so the first paint only carries the form. */
export default function Results({ result, planRequest, onCopy }) {
  const containerRef = useRef(null);
  // Move focus here once this lazy chunk has mounted, so keyboard and screen reader users land on the plan.
  useEffect(() => {
    containerRef.current?.focus();
  }, [result]);
  return (
    <VStack ref={containerRef} tabIndex={-1} role="region" aria-label="Your clean-air plan" gap={5} className="results">
      <AirNow location={result.location} air={result.air} />
      <PlanView plan={result.plan} language={result.language} />
      <ImpactView commute={result.impact.commute} outdoor={result.impact.outdoor} />
      <ForecastChart forecast={result.air.forecast} />
      <HStack>
        <Button label="Copy plan to share" variant="secondary" onClick={onCopy} />
      </HStack>
      <Suspense fallback={<Spinner label="Loading chat..." />}>
        <Chat key={`${planRequest.lat},${planRequest.lng}`} planRequest={planRequest} />
      </Suspense>
    </VStack>
  );
}
