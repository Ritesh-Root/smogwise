export const COMMUTE_OPTIONS = [
  { value: 'car_petrol', label: 'Petrol car (alone)' },
  { value: 'car_diesel', label: 'Diesel car (alone)' },
  { value: 'two_wheeler', label: 'Petrol two-wheeler' },
  { value: 'auto_rickshaw', label: 'Auto-rickshaw (CNG)' },
  { value: 'carpool', label: 'Carpool' },
  { value: 'ev', label: 'Electric vehicle' },
  { value: 'bus', label: 'Bus' },
  { value: 'metro', label: 'Metro or train' },
  { value: 'walk_cycle', label: 'Walking or cycling' },
];

export const COOKING_OPTIONS = [
  { value: 'lpg', label: 'LPG cylinder' },
  { value: 'png', label: 'Piped gas' },
  { value: 'electric', label: 'Electric or induction' },
  { value: 'biomass', label: 'Wood, dung or crop waste' },
  { value: 'kerosene', label: 'Kerosene' },
  { value: 'coal', label: 'Coal' },
];

export const HEATING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'electric', label: 'Electric heater' },
  { value: 'gas', label: 'Gas heater' },
  { value: 'biomass', label: 'Wood fire or angithi' },
  { value: 'coal', label: 'Coal' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

export const HOUSEHOLD_OPTIONS = [
  { value: 'children', label: 'Children' },
  { value: 'elderly', label: 'Older adults' },
  { value: 'asthma', label: 'Asthma or lung condition' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'outdoor_worker', label: 'Works outdoors' },
];

export const DEFAULT_PROFILE = {
  household: [],
  commuteMode: 'car_petrol',
  commuteKm: 20,
  commuteDays: 5,
  cookingFuel: 'lpg',
  heating: 'none',
  hasPurifier: false,
  notes: '',
  language: 'en',
};

export const SUGGESTED_QUESTIONS = [
  'Is it safe for the kids to play outside today?',
  'Should we keep the windows open while cooking?',
  'Which mask should we use?',
];

/** Severity 0 (clean) to 5 (severe) mapped to Astryx Badge variants. The matching colours live in app.css. */
export const SEVERITY_STYLES = [
  { badge: 'green' },
  { badge: 'teal' },
  { badge: 'yellow' },
  { badge: 'orange' },
  { badge: 'red' },
  { badge: 'purple' },
];
