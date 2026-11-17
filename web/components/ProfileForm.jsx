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
import { useRef } from 'react';
import {
  COMMUTE_OPTIONS,
  COOKING_OPTIONS,
  HEATING_OPTIONS,
  HOUSEHOLD_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../constants.js';

/**
 * Household form. Validation follows the usual accessible pattern: check a field when the user
 * leaves it or submits, clear its error as soon as they edit it, and move focus to the first
 * invalid field when a submit fails.
 */
export function ProfileForm({
  placeText,
  placeError,
  onPlaceChange,
  onPlaceBlur,
  onLocate,
  isLocating,
  profile,
  onProfileChange,
  onSubmit,
  isSubmitting,
}) {
  const formRef = useRef(null);
  const set = (key) => (value) => onProfileChange({ ...profile, [key]: value });

  function handleSubmit(event) {
    event.preventDefault();
    const invalid = onSubmit();
    if (invalid) formRef.current?.querySelector('[aria-invalid="true"], input')?.focus();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby="form-title" name="household">
      <FormLayout>
        <TextInput
          label="City or neighbourhood"
          description="We use this to look up the air where you live."
          htmlName="place"
          value={placeText}
          onChange={onPlaceChange}
          onBlur={onPlaceBlur}
          isRequired
          autoComplete="address-level2"
          placeholder="e.g. Anand Vihar, Delhi"
          status={placeError ? { type: 'error', message: placeError } : undefined}
        />
        <HStack>
          <Button
            label="Use my location"
            variant="secondary"
            onClick={onLocate}
            isLoading={isLocating}
          />
        </HStack>

        <CheckboxList
          label="Who lives with you"
          description="Tick all that apply. We prioritise protection for the most sensitive people."
          value={profile.household}
          onChange={set('household')}
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
          onChange={set('commuteMode')}
        />
        <HStack gap={4} wrap="wrap">
          <NumberInput
            label="Distance per day (km, both ways)"
            value={profile.commuteKm}
            onChange={set('commuteKm')}
            min={0}
            max={300}
            step={1}
            htmlName="commuteKm"
          />
          <NumberInput
            label="Days per week"
            value={profile.commuteDays}
            onChange={set('commuteDays')}
            min={0}
            max={7}
            step={1}
            htmlName="commuteDays"
          />
        </HStack>

        <Selector
          label="Cooking fuel"
          htmlName="cookingFuel"
          options={COOKING_OPTIONS}
          value={profile.cookingFuel}
          onChange={set('cookingFuel')}
        />
        <RadioList
          label="Winter heating"
          htmlName="heating"
          value={profile.heating}
          onChange={set('heating')}
        >
          {HEATING_OPTIONS.map((option) => (
            <RadioListItem key={option.value} value={option.value} label={option.label} />
          ))}
        </RadioList>
        <CheckboxInput
          label="We own an air purifier"
          htmlName="hasPurifier"
          value={profile.hasPurifier}
          onChange={set('hasPurifier')}
        />

        <RadioList
          label="Plan language"
          htmlName="language"
          orientation="horizontal"
          value={profile.language}
          onChange={set('language')}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <RadioListItem key={option.value} value={option.value} label={option.label} />
          ))}
        </RadioList>

        <TextArea
          label="Anything else?"
          description='Optional, for example "morning school run at 7:30".'
          htmlName="notes"
          rows={2}
          maxLength={300}
          value={profile.notes}
          onChange={set('notes')}
          isOptional
        />

        <HStack>
          <Button
            label="Get my clean-air plan"
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
          />
        </HStack>
      </FormLayout>
    </form>
  );
}
