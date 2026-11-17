// @ts-check
import { COMMUTE_MODES } from '../shared/options.js';

/**
 * Deterministic impact maths. The assistant quotes these numbers instead of inventing its own,
 * so every "impact of your choice" figure shown to a family is reproducible and testable.
 */

const WEEKS_PER_YEAR = 52;
const GRAMS_PER_KG = 1000;
const MG_PER_G = 1000;
const MINUTE_MS = 60_000;

/** Hours (local time) between which outdoor activity is considered: people are asleep outside this window. */
const WAKING_START_HOUR = 6;
const WAKING_END_HOUR = 22;

export const SEVERITY_LABELS = Object.freeze(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very poor', 'Severe']);
const MAX_SEVERITY = SEVERITY_LABELS.length - 1;

/** Upper bound of each severity band, for the local indexes the app understands. */
const AQI_BREAKPOINTS = Object.freeze({
  ind_cpcb: [50, 100, 200, 300, 400],
  usa_epa: [50, 100, 150, 200, 300],
});
/** Local index codes with known breakpoints; any other index is replaced by the universal one. */
export const SUPPORTED_LOCAL_INDEXES = Object.keys(AQI_BREAKPOINTS);

/** The universal index runs 0-100 where higher is cleaner, so each severity band is 20 points wide. */
const UAQI_MAX = 100;
const UAQI_BAND_WIDTH = 20;

/**
 * @typedef {{code: string, name: string, aqi: number, category: string, higherIsWorse: boolean}} AqiIndex
 * @typedef {{time: string, index: AqiIndex}} ForecastHour
 * @typedef {keyof typeof COMMUTE_MODES} CommuteMode
 * @typedef {{commuteMode: string, commuteKm: number, commuteDays: number}} CommuteProfile
 */

const roundToOneDecimal = (/** @type {number} */ value) => Math.round(value * 10) / 10;

/**
 * Wall-clock time at a place, as a Date whose UTC fields hold the local time.
 * @param {string} iso ISO timestamp
 * @param {number} utcOffsetMinutes local time minus UTC, in minutes
 */
export const toLocalDate = (iso, utcOffsetMinutes) => new Date(Date.parse(iso) + utcOffsetMinutes * MINUTE_MS);

/**
 * Weekly emissions of the current commute and what each cleaner mode would save.
 * @param {CommuteProfile} profile
 */
export function commuteImpact({ commuteMode, commuteKm, commuteDays }) {
  const weeklyKm = commuteKm * commuteDays;
  const current = COMMUTE_MODES[/** @type {CommuteMode} */ (commuteMode)];
  const weekly = (/** @type {{co2: number, pm25: number}} */ mode) => ({
    co2KgWeek: roundToOneDecimal((mode.co2 * weeklyKm) / GRAMS_PER_KG),
    pm25GWeek: roundToOneDecimal((mode.pm25 * weeklyKm) / MG_PER_G),
  });
  const currentWeekly = weekly(current);
  const alternatives = Object.entries(COMMUTE_MODES)
    .filter(([, mode]) => mode.co2 < current.co2 && mode.pm25 <= current.pm25)
    .map(([id, mode]) => {
      const next = weekly(mode);
      const co2SavedKgWeek = roundToOneDecimal(currentWeekly.co2KgWeek - next.co2KgWeek);
      return {
        mode: id,
        label: mode.label,
        ...next,
        co2SavedKgWeek,
        co2SavedKgYear: Math.round(co2SavedKgWeek * WEEKS_PER_YEAR),
        co2SavedPercent: Math.round((1 - mode.co2 / current.co2) * 100),
        pm25SavedGWeek: roundToOneDecimal(currentWeekly.pm25GWeek - next.pm25GWeek),
      };
    })
    .filter((alternative) => alternative.co2SavedKgWeek > 0)
    .sort((a, b) => b.co2SavedKgWeek - a.co2SavedKgWeek);
  return { mode: commuteMode, label: current.label, weeklyKm, ...currentWeekly, alternatives };
}

/**
 * Map an index to 0 (clean) to 5 (severe) so the UI and the assistant can reason about severity
 * without knowing each country's breakpoints.
 * @param {{code: string, aqi: number, higherIsWorse: boolean}} index
 * @returns {number}
 */
export function severity(index) {
  if (!index.higherIsWorse) {
    return Math.min(MAX_SEVERITY, Math.max(0, Math.floor((UAQI_MAX - index.aqi) / UAQI_BAND_WIDTH)));
  }
  const bands = AQI_BREAKPOINTS[/** @type {keyof typeof AQI_BREAKPOINTS} */ (index.code)] ?? AQI_BREAKPOINTS.usa_epa;
  const level = bands.findIndex((limit) => index.aqi <= limit);
  return level === -1 ? MAX_SEVERITY : level;
}

/** How bad an index value is, on one scale for both the local (higher is worse) and universal indexes. */
export const badness = (/** @type {{aqi: number, higherIsWorse: boolean}} */ index) =>
  index.higherIsWorse ? index.aqi : UAQI_MAX - index.aqi;

/**
 * Cleanest and dirtiest waking hour in the forecast, and how much cleaner the best hour is.
 * Returns null when no forecast hour falls in the waking window.
 * @param {ForecastHour[]} forecast
 * @param {number} utcOffsetMinutes
 */
export function outdoorWindows(forecast, utcOffsetMinutes = 0) {
  const waking = forecast.filter((hour) => {
    const localHour = toLocalDate(hour.time, utcOffsetMinutes).getUTCHours();
    return localHour >= WAKING_START_HOUR && localHour < WAKING_END_HOUR;
  });
  if (waking.length === 0) return null;
  const sorted = [...waking].sort((a, b) => badness(a.index) - badness(b.index));
  const best = sorted[0];
  const worst = /** @type {ForecastHour} */ (sorted.at(-1));
  const worstBadness = badness(worst.index);
  return {
    best: { time: best.time, aqi: best.index.aqi, category: best.index.category },
    worst: { time: worst.time, aqi: worst.index.aqi, category: worst.index.category },
    reductionPercent: worstBadness > 0 ? Math.round((1 - badness(best.index) / worstBadness) * 100) : 0,
  };
}
