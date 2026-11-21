/**
 * Shapes of the objects the browser exchanges with the API (JSDoc only, no runtime code).
 * They mirror src/types.js on the server.
 *
 * @typedef {import('zod').infer<typeof import('../src/validation.js').profileSchema>} Profile
 * @typedef {{lat: number, lng: number, label: string}} Place
 * @typedef {Place & {typed: string}} ResolvedPlace A place plus the text the user typed to find it
 * @typedef {{code: string, name: string, aqi: number, category: string, higherIsWorse: boolean}} AqiIndex
 * @typedef {{time: string, index: AqiIndex, severity: number}} ForecastHour
 * @typedef {{code: string, name: string, value: number | null, units: string}} Pollutant
 * @typedef {{member: string, advice: string}} GroupAdvice
 *
 * @typedef {object} Air
 * @property {AqiIndex} index
 * @property {string} dominantPollutant
 * @property {Pollutant[]} pollutants
 * @property {string} healthAdvice
 * @property {number} severity
 * @property {string} severityLabel
 * @property {ForecastHour[]} forecast
 *
 * @typedef {object} CommuteAlternative
 * @property {string} mode
 * @property {string} label
 * @property {number} co2SavedKgWeek
 * @property {number} co2SavedKgYear
 * @property {number} co2SavedPercent
 * @property {number} pm25SavedGWeek
 *
 * @typedef {object} CommuteImpact
 * @property {string} label
 * @property {number} weeklyKm
 * @property {number} co2KgWeek
 * @property {number} pm25GWeek
 * @property {CommuteAlternative[]} alternatives
 *
 * @typedef {{time: string, aqi: number, category: string}} Reading
 * @typedef {{best: Reading, worst: Reading, reductionPercent: number}} OutdoorImpact
 * @typedef {{commute: CommuteImpact, outdoor: OutdoorImpact | null}} Impact
 *
 * @typedef {object} Plan
 * @property {string} summary
 * @property {string[]} alerts
 * @property {Array<{time: string, action: string, impact: string}>} routine
 * @property {Array<{tip: string, impact: string, cost: string}>} indoor
 * @property {Array<{swap: string, impact: string}>} alternatives
 *
 * @typedef {object} PlanResult The response of POST /api/plan.
 * @property {{label: string, lat: number, lng: number, utcOffsetMinutes: number}} location
 * @property {Air} air
 * @property {Impact} impact
 * @property {GroupAdvice[]} groupAdvice
 * @property {Plan} plan
 *
 * @typedef {object} PlanRequest The body of POST /api/plan and the context for chat.
 * @property {number} lat
 * @property {number} lng
 * @property {string} label
 * @property {number} utcOffsetMinutes
 * @property {Profile} profile
 *
 * @typedef {{role: 'user' | 'model', text: string}} ChatTurn
 * @typedef {{[key: string]: string}} PlanStrings
 * @typedef {(message: string) => void} Announce Writes a message into the page's polite status region.
 */
export {};
