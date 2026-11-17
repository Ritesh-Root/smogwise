/**
 * Deterministic impact maths. The assistant quotes these numbers instead of inventing its own,
 * so every "impact of your choice" figure shown to a family is reproducible and testable.
 *
 * Emission factors are approximate per-passenger planning figures for Indian city traffic
 * (CO2 in g/km, tailpipe PM2.5 in mg/km), rounded from India GHG Program and CPCB/ARAI
 * fleet-average ranges. They are estimates for comparing options, not measurements.
 */
export const COMMUTE_MODES = Object.freeze({
  walk_cycle: { label: 'Walking or cycling', co2: 0, pm25: 0 },
  metro: { label: 'Metro or train', co2: 30, pm25: 0 },
  bus: { label: 'Bus', co2: 50, pm25: 8 },
  carpool: { label: 'Carpool (3 people)', co2: 57, pm25: 3 },
  ev: { label: 'Electric vehicle', co2: 80, pm25: 0 },
  two_wheeler: { label: 'Petrol two-wheeler', co2: 45, pm25: 15 },
  auto_rickshaw: { label: 'Auto-rickshaw (CNG)', co2: 60, pm25: 5 },
  car_petrol: { label: 'Petrol car (alone)', co2: 170, pm25: 10 },
  car_diesel: { label: 'Diesel car (alone)', co2: 160, pm25: 30 },
});

const WEEKS_PER_YEAR = 52;
const round1 = (value) => Math.round(value * 10) / 10;

/**
 * Weekly emissions of the current commute and what each cleaner mode would save.
 * @param {{commuteMode: keyof typeof COMMUTE_MODES, commuteKm: number, commuteDays: number}} profile
 */
export function commuteImpact({ commuteMode, commuteKm, commuteDays }) {
  const weeklyKm = commuteKm * commuteDays;
  const current = COMMUTE_MODES[commuteMode];
  const weekly = (mode) => ({
    co2KgWeek: round1((mode.co2 * weeklyKm) / 1000),
    pm25GWeek: round1((mode.pm25 * weeklyKm) / 1000),
  });
  const now = weekly(current);
  const alternatives = Object.entries(COMMUTE_MODES)
    .filter(([, mode]) => mode.co2 < current.co2 && mode.pm25 <= current.pm25)
    .map(([id, mode]) => {
      const next = weekly(mode);
      const co2SavedKgWeek = round1(now.co2KgWeek - next.co2KgWeek);
      return {
        mode: id,
        label: mode.label,
        ...next,
        co2SavedKgWeek,
        co2SavedKgYear: Math.round(co2SavedKgWeek * WEEKS_PER_YEAR),
        co2SavedPercent: Math.round((1 - mode.co2 / current.co2) * 100),
      };
    })
    .filter((alternative) => alternative.co2SavedKgWeek > 0)
    .sort((a, b) => b.co2SavedKgWeek - a.co2SavedKgWeek);
  return { mode: commuteMode, label: current.label, weeklyKm, ...now, alternatives };
}

const BANDS = Object.freeze({
  ind_cpcb: [50, 100, 200, 300, 400],
  usa_epa: [50, 100, 150, 200, 300],
});
export const SEVERITY_LABELS = Object.freeze(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very poor', 'Severe']);

/**
 * Map any supported index to a 0 (clean) to 5 (severe) scale so the UI and the assistant can
 * reason about severity without knowing each country's breakpoints.
 * @param {{code: string, aqi: number, higherIsWorse: boolean}} index
 */
export function severity(index) {
  if (!index.higherIsWorse) return Math.min(5, Math.max(0, Math.floor((100 - index.aqi) / 20)));
  const bands = BANDS[index.code] ?? BANDS.usa_epa;
  const level = bands.findIndex((limit) => index.aqi <= limit);
  return level === -1 ? 5 : level;
}

const badness = (index) => (index.higherIsWorse ? index.aqi : 100 - index.aqi);

/**
 * Cleanest and dirtiest waking hour (06:00-21:59 local) in the forecast, and how much lower
 * the index is at the best hour. Returns null when no forecast hour falls in that window.
 * @param {Array<{time: string, index: {aqi: number, category: string, higherIsWorse: boolean}}>} forecast
 * @param {number} utcOffsetMinutes local time minus UTC, in minutes
 */
export function outdoorWindows(forecast, utcOffsetMinutes = 0) {
  const waking = forecast.filter((hour) => {
    const localHour = new Date(Date.parse(hour.time) + utcOffsetMinutes * 60_000).getUTCHours();
    return localHour >= 6 && localHour < 22;
  });
  if (waking.length === 0) return null;
  const sorted = [...waking].sort((a, b) => badness(a.index) - badness(b.index));
  const best = sorted[0];
  const worst = sorted.at(-1);
  const worstBadness = badness(worst.index);
  return {
    best: { time: best.time, aqi: best.index.aqi, category: best.index.category },
    worst: { time: worst.time, aqi: worst.index.aqi, category: worst.index.category },
    reductionPercent: worstBadness > 0 ? Math.round((1 - badness(best.index) / worstBadness) * 100) : 0,
  };
}
