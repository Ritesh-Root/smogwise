/** "3:30 pm" style time. Forecast hours are shown in the browser's time zone. */
export const formatHour = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** How bad an index value is, on one scale for both the local (higher is worse) and universal indexes. */
export const badness = (index) => (index.higherIsWorse ? index.aqi : 100 - index.aqi);

/** Plain-text version of a plan, for pasting into a family or community group chat. */
export function planToText({ location, air, plan }) {
  const lines = [
    `SmogWise plan for ${location.label}`,
    `Air now: ${air.severityLabel} (${air.index.name} ${air.index.aqi})`,
    '',
    plan.summary,
  ];
  if (plan.alerts.length > 0) lines.push('', 'Alerts:', ...plan.alerts.map((alert) => `- ${alert}`));
  lines.push('', 'Daily routine:', ...plan.routine.map((r) => `- ${r.time}: ${r.action} (${r.impact})`));
  lines.push('', 'Indoor air hacks:', ...plan.indoor.map((i) => `- ${i.tip} [${i.cost}] (${i.impact})`));
  lines.push('', 'Sustainable swaps:', ...plan.alternatives.map((a) => `- ${a.swap} (${a.impact})`));
  return lines.join('\n');
}
