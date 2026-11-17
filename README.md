# SmogWise

A GenAI assistant that helps families and communities get through severe winter smog and urban air pollution.

**Live app:** https://smogwise-295478535981.asia-south1.run.app

## Problem statement

> Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. The application should suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle, while clearly explaining the direct impact of their choices.

## How SmogWise answers it

| Requirement | What the app does |
| --- | --- |
| Tailored to location | Geocodes a typed place or the browser's location, then reads live conditions and a 24-hour forecast for that spot from the Google Air Quality API (India's CPCB index where available). |
| Tailored to lifestyle | A short household profile: who lives there (children, older adults, asthma, pregnancy, outdoor work), commute mode and distance, cooking fuel, winter heating, purifier, free-text notes. |
| Low-emission daily routines | Gemini builds a time-ordered routine scheduled around the cleanest and dirtiest forecast hours. |
| Indoor air quality hacks | Tips matched to the household's fuel, heating and budget, each with a rough cost. |
| Sustainable alternatives | Swaps for current habits, such as a cleaner commute or heating source. |
| Direct impact of choices | A deterministic engine computes weekly and yearly CO2 and PM2.5 for the commute, what each cleaner mode saves, and how much cleaner the best outdoor hour is. Gemini must quote these numbers, and the UI shows them in a table. |
| Assistant | A follow-up chat that answers questions using the same live data and household profile. |
| Families and communities | Plain-language output, English or Hindi, usable by keyboard and screen reader. |

## How it works

```
Browser (vanilla HTML/CSS/JS)
   |  GET /api/location   POST /api/plan   POST /api/chat
   v
Express on Cloud Run
   |-- Geocoding API ............ place name <-> coordinates
   |-- Air Quality API .......... current conditions + hourly forecast
   |-- impact engine ............ commute emissions, best/worst hours, severity (pure functions)
   `-- Gemini on Vertex AI ...... structured JSON plan and chat, grounded in the facts above
```

1. The server gathers facts: place, air quality, forecast and the impact maths.
2. Those facts go to Gemini as the only source of truth, with a response schema for the plan.
3. The model's JSON is validated again on the server before it reaches the browser.

The model never produces the numbers. It explains numbers the server computed, so the impact figures are reproducible and unit tested.

## Google services

| Service | Use |
| --- | --- |
| Gemini on Vertex AI (`@google/genai`) | Plan generation with structured output, safety settings and follow-up chat |
| Air Quality API | Live local AQI, pollutant concentrations, health advice, 24-hour forecast |
| Geocoding API | Place search and reverse geocoding |
| Cloud Run | Hosting, scale to zero |
| Cloud Build and Artifact Registry | Container build from the Dockerfile |
| Secret Manager | Maps API key, mounted at runtime |
| IAM | Dedicated least-privilege runtime service account; Gemini is called with its identity, so there is no model API key |
| Cloud Logging | Structured error logs |

## Security

- Strict Content Security Policy (`'self'` only, no inline scripts or styles), HSTS, `nosniff`, `frame-ancestors 'none'` and a Permissions-Policy, via Helmet.
- Every request is validated with zod: strict objects, enums, numeric ranges and length limits. Bodies are capped at 10 kB.
- Rate limit of 30 API requests per minute per client.
- No secrets in the repository. The Maps key is restricted to the two APIs it needs and lives in Secret Manager.
- Prompt-injection defence: user text only appears inside a JSON context block that the model is told to treat as data, the model is limited to air quality topics, and its plan output must match a schema.
- Model output is rendered with `textContent`, never `innerHTML`.
- Upstream error details are logged, not returned to the client.
- The container runs as a non-root user with production dependencies only.

## Efficiency

- Air quality responses are cached per ~1 km grid cell for 10 minutes and geocoding for 24 hours. Concurrent identical lookups share one upstream request.
- Current conditions and forecast are fetched in parallel.
- The model context is trimmed to the fields it needs, and thinking is set to low, which roughly halved response time.
- No frontend framework or build step: the page is about 25 kB before compression, served gzipped with cache headers.

## Accessibility

- Semantic landmarks, one `h1`, ordered headings, a skip link, and a label on every control.
- Status messages use `role="status"`, the chat uses `role="log"`, and focus moves to the results when the plan is ready.
- Air quality severity is always given in words as well as colour.
- Colours meet WCAG AA contrast in light and dark themes, touch targets are at least 44 px, and the layout reflows down to 320 px.
- Works with keyboard only. Respects `prefers-reduced-motion` and `prefers-color-scheme`.
- Plans can be generated in Hindi.

## Testing

```bash
npm install
npm run lint
npm test
```

37 tests run on Node's built-in test runner with no network access. They cover the impact maths, cache, input validation, the three Google service clients (with fake `fetch` and a fake model), every API route, security headers, rate limiting, error masking and baseline page accessibility. Coverage is enforced at 90% of lines and currently stands at 100%. GitHub Actions runs lint, tests and `npm audit` on every push.

## Run locally

Requires Node 22 or newer, a Google Cloud project with Vertex AI enabled, and an API key for the Air Quality and Geocoding APIs.

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project
export MAPS_API_KEY=your-key
npm start        # http://localhost:8080
```

Optional settings: `GEMINI_MODEL` (default `gemini-3-flash-preview`), `VERTEX_LOCATION` (default `global`), `PORT`.

## Deploy

```bash
gcloud run deploy smogwise --source . --region asia-south1 \
  --service-account smogwise-runtime@$PROJECT.iam.gserviceaccount.com \
  --set-secrets MAPS_API_KEY=smogwise-maps-key:latest \
  --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT --allow-unauthenticated
```

The runtime service account needs `roles/aiplatform.user` on the project and `roles/secretmanager.secretAccessor` on the secret.

## Project layout

```
server.js              entry point: wires real Google clients into the app
src/app.js             Express app, routes, security middleware, error handling
src/validation.js      zod schemas for requests and for the model's plan
src/prompt.js          system instruction, model context, response schema
src/engine/impact.js   deterministic impact maths
src/services/          Air Quality, Geocoding, Gemini clients and the TTL cache
public/                accessible single-page frontend
test/                  unit and route tests
```

## Assumptions and limits

- Commute emission factors are rounded planning figures for Indian city traffic. They are meant for comparing options, not for reporting.
- "Best hour" compares forecast AQI between 06:00 and 22:00 local time, using the browser's time zone.
- Guidance is general wellbeing advice, not medical advice.
