import { Sparkles } from 'lucide-react'
import Button from '../../components/ui/Button'
import Chip from '../../components/ui/Chip'
import Field from '../../components/ui/Field'
import Stepper from '../../components/ui/Stepper'
import { addDays, countDaysInclusive, todayInputValue } from '../../utils/formatDate'
import { ACTIVITY_TYPES, LIMITS } from '../../utils/constants'
import FormSection from './FormSection'
import PaceSelector from './PaceSelector'
import TierCards from './TierCards'
import styles from './PlanForm.module.css'

function tripLengthHint(startDate, endDate) {
  const days = countDaysInclusive(startDate, endDate)
  if (!days || days < 1) return `Up to ${LIMITS.maxDays} days.`
  const nights = days - 1
  return `${days} ${days === 1 ? 'day' : 'days'}, ${nights} ${nights === 1 ? 'night' : 'nights'}. Up to ${LIMITS.maxDays} days.`
}

export default function PlanForm({ values, errors, destinations, selectedDestination, busy, onChange, onSubmit }) {
  const today = todayInputValue()

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit()
  }

  function handleStartDate(startDate) {
    const changes = { startDate }
    if (startDate && values.endDate && values.endDate < startDate) changes.endDate = startDate
    onChange(changes)
  }

  function toggleInterest(type) {
    const interests = values.interests.includes(type)
      ? values.interests.filter((value) => value !== type)
      : [...values.interests, type]
    onChange({ interests })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormSection title="Where and when">
        <Field label="Destination" error={errors.destinationId}>
          {(control) => (
            <select
              {...control}
              value={values.destinationId}
              onChange={(event) => onChange({ destinationId: event.target.value })}
              disabled={!destinations}
            >
              <option value="">{destinations ? 'Choose a destination' : 'Loading destinations…'}</option>
              {destinations?.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}, {destination.state}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className={styles.dates}>
          <Field label="Start date" error={errors.startDate}>
            {(control) => (
              <input
                {...control}
                type="date"
                min={today}
                value={values.startDate}
                onChange={(event) => handleStartDate(event.target.value)}
              />
            )}
          </Field>
          <Field label="End date" error={errors.endDate} hint={tripLengthHint(values.startDate, values.endDate)}>
            {(control) => (
              <input
                {...control}
                type="date"
                min={values.startDate || today}
                max={values.startDate ? addDays(values.startDate, LIMITS.maxDays - 1) : undefined}
                value={values.endDate}
                onChange={(event) => onChange({ endDate: event.target.value })}
              />
            )}
          </Field>
        </div>

        {selectedDestination && (
          <p className={styles.seasonNote}>
            {selectedDestination.name} is at its best from {selectedDestination.bestSeason}. Most visitors stay{' '}
            {selectedDestination.idealDays.min} to {selectedDestination.idealDays.max} days.
          </p>
        )}
      </FormSection>

      <FormSection title="Who is going">
        <Field label="Travellers" error={errors.travelers} hint="Two travellers share a room in the estimate.">
          {(control) => (
            <Stepper
              {...control}
              value={values.travelers}
              min={LIMITS.minTravelers}
              max={LIMITS.maxTravelers}
              unit="traveller"
              onChange={(travelers) => onChange({ travelers })}
            />
          )}
        </Field>
      </FormSection>

      <FormSection title="Budget" description="Sets the class of stay, food and local transport.">
        <TierCards
          value={values.budgetTier}
          error={errors.budgetTier}
          dailyCost={selectedDestination?.dailyCost}
          travelers={values.travelers}
          onChange={(budgetTier) => onChange({ budgetTier })}
        />
      </FormSection>

      <FormSection title="Interests" description="Optional. Matching places are ranked higher.">
        <fieldset className={styles.chips}>
          <legend className="visually-hidden">Interests</legend>
          {ACTIVITY_TYPES.map((type) => (
            <Chip key={type.value} selected={values.interests.includes(type.value)} onToggle={() => toggleInterest(type.value)}>
              {type.label}
            </Chip>
          ))}
        </fieldset>
        {errors.interests && (
          <p className={styles.error} role="alert">
            {errors.interests}
          </p>
        )}
      </FormSection>

      <FormSection title="Pace" description="How many hours of visits and driving fit in a day.">
        <PaceSelector value={values.pace} error={errors.pace} onChange={(pace) => onChange({ pace })} />
      </FormSection>

      <div className={styles.submit}>
        <Button type="submit" size="lg" busy={busy}>
          <Sparkles aria-hidden="true" />
          {busy ? 'Generating plan' : 'Generate plan'}
        </Button>
        {Object.keys(errors).length > 0 && (
          <p className={styles.error} role="alert">
            Some answers need attention before the plan can be generated.
          </p>
        )}
      </div>
    </form>
  )
}
