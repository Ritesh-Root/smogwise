// @ts-check
/**
 * Choices offered in the form and accepted by the API. The server and the browser both import this
 * module, so labels and allowed values cannot drift apart.
 */

/**
 * Per-passenger planning figures for Indian city traffic, rounded from fleet-average ranges
 * (CO2 in g/km, tailpipe PM2.5 in mg/km). They are estimates for comparing options, not measurements.
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

/** @typedef {{value: string, label: string}} Option */

/** @type {Option[]} */
export const COMMUTE_OPTIONS = Object.entries(COMMUTE_MODES).map(([value, { label }]) => ({ value, label }));

/** @type {Option[]} */
export const HOUSEHOLD_OPTIONS = [
  { value: 'children', label: 'Children' },
  { value: 'elderly', label: 'Older adults' },
  { value: 'asthma', label: 'Asthma or lung condition' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'outdoor_worker', label: 'Works outdoors' },
];

/** @type {Option[]} */
export const COOKING_OPTIONS = [
  { value: 'lpg', label: 'LPG cylinder' },
  { value: 'png', label: 'Piped gas' },
  { value: 'electric', label: 'Electric or induction' },
  { value: 'biomass', label: 'Wood, dung or crop waste' },
  { value: 'kerosene', label: 'Kerosene' },
  { value: 'coal', label: 'Coal' },
];

/** @type {Option[]} */
export const HEATING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'electric', label: 'Electric heater' },
  { value: 'gas', label: 'Gas heater' },
  { value: 'biomass', label: 'Wood fire or angithi' },
  { value: 'coal', label: 'Coal' },
];

/**
 * `promptName` is how the model is told which language to write in. `nativeName` is how the language
 * writes its own name, so the form can mark it with the right `lang`.
 */
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', nativeName: 'English', englishName: 'English', promptName: 'English' },
  {
    value: 'hi',
    label: 'हिन्दी (Hindi)',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    promptName: 'Hindi (Devanagari script)',
  },
];

/** @param {Option[]} options */
export const valuesOf = (options) => options.map((option) => option.value);
