// @ts-check
import { commuteImpact, outdoorWindows, severity, SEVERITY_LABELS } from './engine/impact.js';

/** Which Air Quality API health-advice group applies to each household member. */
const ADVICE_GROUP = {
  children: 'children',
  elderly: 'elderly',
  asthma: 'lungDiseasePopulation',
  pregnant: 'pregnantWomen',
  outdoor_worker: 'athletes',
};

/**
 * Everything the assistant and the UI need to know about one household, gathered once.
 * @param {import('./types.js').AirQualityService} airQuality
 * @param {import('./types.js').PlanRequest} request
 * @returns {Promise<import('./types.js').PlanContext>}
 */
export async function buildContext(airQuality, { lat, lng, label, utcOffsetMinutes, profile }) {
  const { healthByGroup, ...air } = await airQuality.getSnapshot(lat, lng, profile.language);
  const level = severity(air.index);
  const groupAdvice = profile.household
    .map((member) => ({
      member,
      advice: healthByGroup[ADVICE_GROUP[/** @type {keyof typeof ADVICE_GROUP} */ (member)]],
    }))
    .filter((entry) => entry.advice);
  return {
    location: { label, lat, lng, utcOffsetMinutes },
    air: {
      ...air,
      severity: level,
      severityLabel: SEVERITY_LABELS[level],
      forecast: air.forecast.map((hour) => ({ ...hour, severity: severity(hour.index) })),
    },
    impact: {
      commute: commuteImpact(profile),
      outdoor: outdoorWindows(air.forecast, utcOffsetMinutes),
    },
    profile,
    groupAdvice,
  };
}
