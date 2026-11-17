import { Banner } from '@astryxdesign/core/Banner';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { lazy, Suspense, useState } from 'react';
import { createPlan, findPlace, reversePlace } from './api.js';
import { ProfileForm } from './components/ProfileForm.jsx';
import { DEFAULT_PROFILE } from './constants.js';
import { planToText } from './format.js';

// Results (tables, lists, chat) are only needed once a plan exists, so they load on demand.
const Results = lazy(() => import('./components/Results.jsx'));

const validatePlace = (text) => (text.trim().length < 2 ? 'Enter your city or neighbourhood.' : '');

export function App() {
  const [placeText, setPlaceText] = useState('');
  const [placeError, setPlaceError] = useState('');
  const [place, setPlace] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isLocating, setIsLocating] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [status, setStatus] = useState('');
  const [failure, setFailure] = useState('');
  const [result, setResult] = useState(null);
  const [planRequest, setPlanRequest] = useState(null);

  function handlePlaceChange(value) {
    setPlaceText(value);
    setPlaceError('');
    if (place && place.typed !== value.trim()) setPlace(null);
  }

  function handlePlaceBlur() {
    if (placeText.length > 0) setPlaceError(validatePlace(placeText));
  }

  function handleLocate() {
    setPlaceError('');
    if (!navigator.geolocation) {
      setPlaceError('Your browser cannot share location. Type your city instead.');
      return;
    }
    setIsLocating(true);
    setStatus('Asking your browser for your location...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const found = await reversePlace(coords.latitude, coords.longitude);
          setPlaceText(found.label);
          setPlace({ ...found, typed: found.label });
          setStatus(`Location set to ${found.label}.`);
        } catch (error) {
          setStatus('');
          setPlaceError(error.message);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setStatus('');
        setPlaceError('We could not get your location. Type your city instead.');
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  async function buildPlan() {
    setFailure('');
    setIsPlanning(true);
    try {
      let target = place;
      if (!target || target.typed !== placeText.trim()) {
        setStatus('Finding your location...');
        try {
          target = { ...(await findPlace(placeText.trim())), typed: placeText.trim() };
        } catch (error) {
          setStatus('');
          setPlaceError(error.message);
          return;
        }
        setPlace(target);
      }
      setStatus('Checking the air and building your plan. This takes a few seconds...');
      const request = {
        lat: target.lat,
        lng: target.lng,
        label: target.label,
        utcOffsetMinutes: -new Date().getTimezoneOffset(),
        profile,
      };
      const data = await createPlan(request);
      setPlanRequest(request);
      setResult({ ...data, language: profile.language });
      setStatus('Your plan is ready.');
    } catch (error) {
      setStatus('');
      setFailure(error.message);
    } finally {
      setIsPlanning(false);
    }
  }

  /** Returns true when the form is invalid, so the form can move focus to the first problem. */
  function handleSubmit() {
    const error = validatePlace(placeText);
    setPlaceError(error);
    if (error) return true;
    buildPlan();
    return false;
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(planToText(result));
      setStatus('Plan copied. Paste it into your family or community group.');
    } catch {
      setStatus('Copying is not available in this browser. Select the text instead.');
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <VStack className="page" gap={6} paddingBlock={6} paddingInline={4} maxWidth={880}>
        <VStack as="header" gap={1}>
          <Heading level={1}>SmogWise</Heading>
          <Text color="secondary">A clean-air plan for your household, built from live air quality where you live.</Text>
        </VStack>

        <VStack as="main" id="main" gap={5}>
          <Card padding={6}>
            <VStack gap={4}>
              <Heading level={2} id="form-title">Tell us about your household</Heading>
              <ProfileForm
                placeText={placeText}
                placeError={placeError}
                onPlaceChange={handlePlaceChange}
                onPlaceBlur={handlePlaceBlur}
                onLocate={handleLocate}
                isLocating={isLocating}
                profile={profile}
                onProfileChange={setProfile}
                onSubmit={handleSubmit}
                isSubmitting={isPlanning}
              />
            </VStack>
          </Card>

          <HStack gap={3} align="center" role="status" aria-live="polite">
            {isPlanning && <Spinner size="sm" />}
            <Text>{status}</Text>
          </HStack>
          {failure && <Banner status="error" title={failure} />}

          {result && (
            <Suspense fallback={<Spinner label="Loading your plan..." />}>
              <Results result={result} planRequest={planRequest} onCopy={copyPlan} />
            </Suspense>
          )}
        </VStack>

        <VStack as="footer">
          <Text as="p" type="supporting">
            Air quality and forecasts from the Google Maps Platform Air Quality API. Guidance is generated by Gemini and is not medical advice.
          </Text>
        </VStack>
      </VStack>
    </>
  );
}
