/**
 * Text for the parts of the page that belong to the plan, in the plan's language. Everything inside the
 * plan card is then in one language, so it can be marked with a correct `lang` attribute.
 * @type {Record<string, import('./types.js').PlanStrings>}
 */
export const STRINGS = {
  en: {
    planTitle: 'Your plan for today',
    routine: 'Daily routine',
    indoor: 'Indoor air hacks',
    swaps: 'Sustainable swaps',
    impact: 'Impact',
    cost: 'Cost',
    alerts: 'Alerts',
    sharePlanFor: 'SmogWise plan for',
    airNow: 'Air now',
  },
  hi: {
    planTitle: 'आज की आपकी योजना',
    routine: 'दैनिक दिनचर्या',
    indoor: 'घर के अंदर हवा साफ़ रखने के उपाय',
    swaps: 'टिकाऊ विकल्प',
    impact: 'प्रभाव',
    cost: 'लागत',
    alerts: 'चेतावनी',
    sharePlanFor: 'स्मॉगवाइज़ योजना:',
    airNow: 'अभी की हवा',
  },
};

/** @param {string} language */
export const stringsFor = (language) => STRINGS[language] ?? STRINGS.en;
