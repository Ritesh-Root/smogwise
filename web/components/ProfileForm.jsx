import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { HStack } from '@astryxdesign/core/HStack';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useEffect, useRef } from 'react';
import {
  COMMUTE_OPTIONS,
  COOKING_OPTIONS,
  HEATING_OPTIONS,
  HOUSEHOLD_OPTIONS,
  LANGUAGE_OPTIONS,
  LIMITS,
} from '../constants.js';

/** A language's name, with its own-script part marked so screen readers pronounce it correctly. */
const languageLabel = ({ value, nativeName, englishName }) =>
  value === 'en' ? (
    englishName
  ) : (
    <>
      <span lang={value}>{nativeName}</span> ({englishName})
    </>
  );

const fieldError = (message) => (message ? { type: 'error', message } : undefined);

/**
 * Household form. A field is checked when the user leaves it or submits, its error clears as they edit,
 * and after a failed submit focus moves to the first invalid field once the errors are on screen.
 * @param {{
 *   place: ReturnType<typeof import('../hooks/usePlace.js').usePlace>,
 *   profile: import('../types.js').Profile,
 *   onProfileChange: (profile: import('../types.js').Profile) => void,
 *   onSubmit: () => void,
 *   isSubmitting: boolean,
 *   failedSubmits: number,
 * }} props
 */
export function ProfileForm({ place, profile, onProfileChange, onSubmit, isSubmitting, failedSubmits }) {
  const formRef = useRef(null);
  const updateField = (key) => (value) => onProfileChange({ ...profile, [key]: value });

  useEffect(() => {
    if (failedSubmits > 0) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [failedSubmits]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby="form-title" name="household">
      <FormLayout>
        <TextInput
          label="City or neighbourhood"
          description="We use this to look up the air where you live."
          htmlName="place"
          value={place.text}
          onChange={place.onChange}
          onBlur={place.onBlur}
          isRequired
          autoComplete="address-level2"
          placeholder="e.g. Anand Vihar, Delhi"
          status={fieldError(place.error)}
        />
        <HStack>
          <Button label="Use my location" variant="secondary" onClick={place.locate} isLoading={place.isLocating} />
        </HStack>

        <CheckboxList
          label="Who lives with you"
          description="Tick all that apply. We prioritise protection for the most sensitive people."
          value={profile.household}
          onChange={updateField('household')}
          density="compact"
          isOptional
        >
          {HOUSEHOLD_OPTIONS.map((option) => (
            <CheckboxListItem key={option.value} value={option.value} label={option.label} />
          ))}
        </CheckboxList>

        <Selector
          label="Main way you travel"
          htmlName="commuteMode"
          options={COMMUTE_OPTIONS}
          value={profile.commuteMode}
          onChange={updateField('commuteMode')}
        />
        <HStack gap={4} wrap="wrap">
          <NumberInput
            label="Distance per day (km, both ways)"
            value={profile.commuteKm}
            onChange={updateField('commuteKm')}
            min={0}
            max={LIMITS.commuteKmMax}
            step={1}
            htmlName="commuteKm"
            isRequired
          />
          <NumberInput
            label="Days per week"
            value={profile.commuteDays}
            onChange={updateField('commuteDays')}
            min={0}
            max={LIMITS.commuteDaysMax}
            step={1}
            isIntegerOnly
            htmlName="commuteDays"
            isRequired
          />
        </HStack>

        <Selector
          label="Cooking fuel"
          htmlName="cookingFuel"
          options={COOKING_OPTIONS}
          value={profile.cookingFuel}
          onChange={updateField('cookingFuel')}
        />
        <RadioList label="Winter heating" htmlName="heating" value={profile.heating} onChange={updateField('heating')}>
          {HEATING_OPTIONS.map((option) => (
            <RadioListItem key={option.value} value={option.value} label={option.label} />
          ))}
        </RadioList>
        <CheckboxInput
          label="We own an air purifier"
          htmlName="hasPurifier"
          value={profile.hasPurifier}
          onChange={updateField('hasPurifier')}
        />

        <RadioList
          label="Plan language"
          htmlName="language"
          orientation="horizontal"
          value={profile.language}
          onChange={updateField('language')}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <RadioListItem key={option.value} value={option.value} label={languageLabel(option)} />
          ))}
        </RadioList>

        <TextArea
          label="Anything else?"
          description='Optional, for example "morning school run at 7:30".'
          htmlName="notes"
          rows={2}
          maxLength={LIMITS.notesMax}
          value={profile.notes}
          onChange={updateField('notes')}
          isOptional
        />

        <HStack>
          <Button label="Get my clean-air plan" type="submit" variant="primary" size="lg" isLoading={isSubmitting} />
        </HStack>
      </FormLayout>
    </form>
  );
}
