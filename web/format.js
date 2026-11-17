import { stringsFor } from './strings.js';

/** "3:30 pm" style time. Forecast hours are shown in the browser's time zone. */
export const formatHour = (/** @type {string} */ iso) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** How bad an index value is, on one scale for both the local (higher is worse) and universal indexes. */
export const badness = (/** @type {{aqi: number, higherIsWorse: boolean}} */ index) =>
  index.higherIsWorse ? index.aqi : 100 - index.aqi;

/** CSS class that sets the severity colour custom properties. */
export const severityClass = (/** @type {number} */ level) => `sev-${level}`;

/**
 * Everything the forecast chart and its table need, worked out once.
 * @param {import('./types.js').ForecastHour[]} forecast must not be empty
 */
export function summariseForecast(forecast) {
  const worstBadness = Math.max(...forecast.map((hour) => badness(hour.index)), 1);
  const best = forecast.reduce((a, b) => (badness(b.index) < badness(a.index) ? b : a));
  const peak = forecast.reduce((a, b) => (badness(b.index) > badness(a.index) ? b : a));
  const summary =
    `Forecast air quality for the next ${forecast.length} hours. ` +
    `Cleanest at ${formatHour(best.time)} (AQI ${best.index.aqi}), most polluted at ${formatHour(peak.time)} (AQI ${peak.index.aqi}).`;
  const rows = forecast.map((hour) => ({
    time: formatHour(hour.time),
    aqi: hour.index.aqi,
    category: hour.index.category,
  }));
  return { worstBadness, summary, rows };
}

/**
 * Plain-text version of a plan, in the plan's language, for pasting into a family or community group chat.
 * @param {import('./types.js').PlanResult} result
 * @param {string} [language]
 */
export function planToText({ location, air, plan }, language = 'en') {
  const t = stringsFor(language);
  const lines = [
    `${t.sharePlanFor} ${location.label}`,
    `${t.airNow}: ${air.severityLabel} (${air.index.name} ${air.index.aqi})`,
    '',
    plan.summary,
  ];
  if (plan.alerts.length > 0) lines.push('', `${t.alerts}:`, ...plan.alerts.map((alert) => `- ${alert}`));
  lines.push('', `${t.routine}:`, ...plan.routine.map((r) => `- ${r.time}: ${r.action} (${r.impact})`));
  lines.push('', `${t.indoor}:`, ...plan.indoor.map((i) => `- ${i.tip} [${i.cost}] (${i.impact})`));
  lines.push('', `${t.swaps}:`, ...plan.alternatives.map((a) => `- ${a.swap} (${a.impact})`));
  return lines.join('\n');
}
