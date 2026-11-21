// @ts-check
/**
 * Shared type definitions (JSDoc only, no runtime code). They describe the objects that cross module
 * boundaries so editors and `npm run typecheck` can check them.
 *
 * @typedef {import('./engine/impact.js').AqiIndex} AqiIndex
 * @typedef {import('./engine/impact.js').ForecastHour} ForecastHour
 * @typedef {import('zod').infer<typeof import('./validation.js').profileSchema>} Profile
 * @typedef {import('zod').infer<typeof import('./validation.js').planRequestSchema>} PlanRequest
 * @typedef {import('zod').infer<typeof import('./validation.js').chatRequestSchema>} ChatRequest
 * @typedef {import('zod').infer<typeof import('./plan.js').planSchema>} Plan
 * @typedef {ChatRequest['history'][number]} ChatTurn
 * @typedef {{lat: number, lng: number, label: string}} Place
 * @typedef {{code: string, name: string, value: number | null, units: string}} Pollutant
 *
 * @typedef {object} AirSnapshot Current conditions and the next 24 hours for one grid cell.
 * @property {AqiIndex} index
 * @property {string} dominantPollutant
 * @property {Pollutant[]} pollutants
 * @property {string} healthAdvice advice for the general population
 * @property {Record<string, string>} healthByGroup advice keyed by the Air Quality API's group names
 * @property {ForecastHour[]} forecast
 *
 * @typedef {{member: string, advice: string}} GroupAdvice
 *
 * @typedef {object} PlanContext Everything the assistant and the UI need to know about one household.
 * @property {{label: string, lat: number, lng: number, utcOffsetMinutes: number}} location
 * @property {Omit<AirSnapshot, 'healthByGroup'> & {severity: number, severityLabel: string}} air
 * @property {{commute: ReturnType<typeof import('./engine/impact.js').commuteImpact>, outdoor: ReturnType<typeof import('./engine/impact.js').outdoorWindows>}} impact
 * @property {Profile} profile
 * @property {GroupAdvice[]} [groupAdvice]
 *
 * @typedef {object} AirQualityService
 * @property {(lat: number, lng: number, language?: string) => Promise<AirSnapshot>} getSnapshot
 *
 * @typedef {object} Geocoder
 * @property {(query: string) => Promise<Place>} search
 * @property {(lat: number, lng: number) => Promise<Place>} reverse
 *
 * @typedef {object} Assistant
 * @property {(context: PlanContext) => Promise<Plan>} generatePlan
 * @property {(context: PlanContext, question: string, history: ChatTurn[]) => Promise<string>} answer
 *
 * @typedef {object} GenerativeClient The slice of the Google GenAI client the app uses.
 * @property {{generateContent: (request: any) => Promise<{text?: string}>}} models
 */
export {};
