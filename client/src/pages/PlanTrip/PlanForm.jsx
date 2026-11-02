import { useState } from 'react'
import { Sparkles, Compass, Check } from 'lucide-react'
import Button from '../../components/ui/Button'
import Chip from '../../components/ui/Chip'
import Field from '../../components/ui/Field'
import Stepper from '../../components/ui/Stepper'
import { addDays, countDaysInclusive, todayInputValue } from '../../utils/formatDate'
import { ACTIVITY_TYPES, LIMITS } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatCurrency'
import { recommendDestinations } from '../../services/tripService'
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

const TRIP_MODES_LIST = [
  { key: 'solo', label: 'Solo', icon: '👤', defaultTravelers: 1 },
  { key: 'couple', label: 'Couple', icon: '👫', defaultTravelers: 2 },
  { key: 'family', label: 'Family', icon: '👨‍👩‍👧', defaultTravelers: 3 },
  { key: 'friends', label: 'Friends', icon: '🏄', defaultTravelers: 4 },
  { key: 'group', label: 'Group Tour', icon: '🚌', defaultTravelers: 8 },
]

export default function PlanForm({ values, errors, destinations, selectedDestination, busy, onChange, onSubmit }) {
  const today = todayInputValue()
  const [recoms, setRecoms] = useState(null)
  const [recomLoading, setRecomLoading] = useState(false)
  const [tripmatesText, setTripmatesText] = useState(() => (values.members || []).filter((m) => m !== 'You').join(', '))

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

  function handleModeSelect(mode) {
    const changes = { tripMode: mode.key }
    if (values.travelers === 1 && mode.defaultTravelers > 1) {
      changes.travelers = mode.defaultTravelers
    } else if (values.travelers > 1 && mode.key === 'solo') {
      changes.travelers = 1
    }
    onChange(changes)
  }

  function handleTripmatesChange(text) {
    setTripmatesText(text)
    const list = text
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    onChange({ members: ['You', ...list] })
  }

  async function handleFetchRecommendations() {
    setRecomLoading(true)
    try {
      const days = countDaysInclusive(values.startDate, values.endDate) || 4
      const res = await recommendDestinations({
        maxBudget: values.maxBudget,
        travelers: values.travelers,
        days,
        interests: values.interests,
        budgetTier: values.budgetTier,
      })
      setRecoms(res.items || [])
    } catch {
      setRecoms([])
    } finally {
      setRecomLoading(false)
    }
  }

  // Calculate scenario totals if dates and destination are selected
  const tripDays = countDaysInclusive(values.startDate, values.endDate) || 3
  const rooms = Math.ceil((values.travelers || 2) / 2)
  const travelCost = values.travelToDestinationCost || 0

  const economyCost = selectedDestination?.dailyCost?.economy || selectedDestination?.dailyCost?.budget
  const standardCost = selectedDestination?.dailyCost?.standard
  const luxuryCost = selectedDestination?.dailyCost?.luxury

  const scenarios = economyCost && standardCost && luxuryCost
    ? [
        {
          tier: 'economy',
          title: 'Economical',
          total: ((economyCost.stay ?? 0) * rooms + ((economyCost.food ?? 0) + (economyCost.transport ?? 0)) * values.travelers) * tripDays + travelCost,
        },
        {
          tier: 'standard',
          title: 'Standard',
          total: ((standardCost.stay ?? 0) * rooms + ((standardCost.food ?? 0) + (standardCost.transport ?? 0)) * values.travelers) * tripDays + travelCost,
        },
        {
          tier: 'luxury',
          title: 'Premium',
          total: ((luxuryCost.stay ?? 0) * rooms + ((luxuryCost.food ?? 0) + (luxuryCost.transport ?? 0)) * values.travelers) * tripDays + travelCost,
        },
      ]
    : null

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormSection title="Where and when">
        <Field label="Origin / Departure City (optional)" hint="Helps contextualize route & transport estimates.">
          {(control) => (
            <input
              {...control}
              type="text"
              placeholder="e.g. Mumbai, New Delhi, Bengaluru"
              value={values.origin || ''}
              onChange={(event) => onChange({ origin: event.target.value })}
            />
          )}
        </Field>

        <Field label="Destination" error={errors.destinationId}>
          {(control) => (
            <select
              {...control}
              value={values.destinationId || ''}
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

        <div style={{ marginBottom: '1rem' }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFetchRecommendations}
            busy={recomLoading}
          >
            <Compass aria-hidden="true" />
            {recomLoading ? 'Matching destinations…' : '✨ Recommend destinations based on my criteria'}
          </Button>

          {recoms && (
            <div className={styles.recomPanel}>
              <strong>Recommended for you:</strong>
              {recoms.length === 0 ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>No direct matches found. Try broadening your budget or interests.</p>
              ) : (
                <div className={styles.recomGrid}>
                  {recoms.slice(0, 3).map((r) => (
                    <div key={r.destination.id} className={styles.recomCard}>
                      <div>
                        <strong>{r.destination.name}</strong>, {r.destination.state}
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Est. ~{formatCurrency(r.estimatedCost)} • Match: {r.matchScore}%
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={values.destinationId === r.destination.id ? 'primary' : 'outline'}
                        onClick={() => onChange({ destinationId: r.destination.id })}
                      >
                        {values.destinationId === r.destination.id ? 'Selected' : 'Choose'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.dates}>
          <Field label="Start date" error={errors.startDate}>
            {(control) => (
              <input
                {...control}
                type="date"
                min={today}
                value={values.startDate || ''}
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
                value={values.endDate || ''}
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
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.4rem' }}>
          Trip Style & Mode
        </label>
        <div className={styles.modeGrid}>
          {TRIP_MODES_LIST.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={`${styles.modeCard} ${values.tripMode === mode.key ? styles.modeCardActive : ''}`}
              onClick={() => handleModeSelect(mode)}
            >
              <div style={{ fontSize: '1.25rem' }}>{mode.icon}</div>
              <div>{mode.label}</div>
            </button>
          ))}
        </div>

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

        {values.travelers > 1 && (
          <Field
            label="Tripmate / Companion Names (optional)"
            hint="Comma-separated names (e.g. Priya, Rahul) for group expense settlements & packing lists."
          >
            {(control) => (
              <input
                {...control}
                type="text"
                placeholder="e.g. Priya, Rahul"
                value={tripmatesText}
                onChange={(event) => handleTripmatesChange(event.target.value)}
              />
            )}
          </Field>
        )}
      </FormSection>

      <FormSection title="Budget" description="Enter your total budget or select a travel style. We calculate all costs deterministically.">
        <div style={{ marginBottom: '1.25rem' }}>
          <Field
            label="Your Total Target Budget (₹)"
            error={errors.maxBudget}
            hint="Enter how much you want to spend in total for this trip. We will tailor the itinerary and tier to your budget."
          >
            {(control) => (
              <input
                {...control}
                type="number"
                inputMode="numeric"
                min="1"
                max="10000000"
                step="500"
                placeholder="e.g. 35000"
                value={values.maxBudget ?? ''}
                onChange={(event) => {
                  const num = event.target.value === '' ? undefined : Number(event.target.value)
                  const changes = { maxBudget: num }
                  if (num && scenarios) {
                    const luxuryTotal = scenarios.find((s) => s.tier === 'luxury')?.total || Infinity
                    const standardTotal = scenarios.find((s) => s.tier === 'standard')?.total || Infinity
                    if (num >= luxuryTotal) changes.budgetTier = 'luxury'
                    else if (num >= standardTotal) changes.budgetTier = 'standard'
                    else changes.budgetTier = 'budget'
                  }
                  onChange(changes)
                }}
              />
            )}
          </Field>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', alignSelf: 'center', marginRight: '0.2rem' }}>Quick budgets:</span>
            {[15000, 25000, 40000, 60000, 100000].map((amt) => (
              <button
                key={amt}
                type="button"
                style={{
                  padding: '0.2rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: values.maxBudget === amt ? 700 : 500,
                  background: values.maxBudget === amt ? 'var(--accent, #0284c7)' : 'var(--surface, #f8fafc)',
                  color: values.maxBudget === amt ? '#ffffff' : 'var(--ink, #0f172a)',
                  border: '1px solid',
                  borderColor: values.maxBudget === amt ? 'var(--accent, #0284c7)' : 'var(--line, #cbd5e1)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const changes = { maxBudget: amt }
                  if (scenarios) {
                    const luxuryTotal = scenarios.find((s) => s.tier === 'luxury')?.total || Infinity
                    const standardTotal = scenarios.find((s) => s.tier === 'standard')?.total || Infinity
                    if (amt >= luxuryTotal) changes.budgetTier = 'luxury'
                    else if (amt >= standardTotal) changes.budgetTier = 'standard'
                    else changes.budgetTier = 'budget'
                  }
                  onChange(changes)
                }}
              >
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          {values.maxBudget && scenarios && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.825rem', padding: '0.5rem 0.75rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', color: '#0369a1' }}>
              {(() => {
                const luxuryTotal = scenarios.find((s) => s.tier === 'luxury')?.total || 0
                const standardTotal = scenarios.find((s) => s.tier === 'standard')?.total || 0
                const budgetTotal = scenarios.find((s) => s.tier === 'economy' || s.tier === 'budget')?.total || 0
                if (values.maxBudget >= luxuryTotal) {
                  return `✨ Your ₹${values.maxBudget.toLocaleString('en-IN')} budget comfortably covers Premium/Luxury stays (~${formatCurrency(luxuryTotal)}).`
                } else if (values.maxBudget >= standardTotal) {
                  return `✨ Your ₹${values.maxBudget.toLocaleString('en-IN')} budget matches Standard tier (~${formatCurrency(standardTotal)}), leaving ~${formatCurrency(values.maxBudget - standardTotal)} buffer.`
                } else if (values.maxBudget >= budgetTotal) {
                  return `✨ Your ₹${values.maxBudget.toLocaleString('en-IN')} budget matches Economical tier (~${formatCurrency(budgetTotal)}).`
                } else {
                  return `⚠️ Your ₹${values.maxBudget.toLocaleString('en-IN')} budget is below the minimum economical estimate (~${formatCurrency(budgetTotal)}). We will optimize stops to stay as close as possible.`
                }
              })()}
            </div>
          )}
        </div>

        <TierCards
          value={values.budgetTier}
          error={errors.budgetTier}
          dailyCost={selectedDestination?.dailyCost}
          travelers={values.travelers}
          maxBudget={values.maxBudget}
          days={tripDays}
          onChange={(budgetTier) => onChange({ budgetTier })}
        />

        {scenarios && (
          <div className={styles.scenarioBox}>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
              Budget Comparison Scenarios ({tripDays} days, {values.travelers} {values.travelers === 1 ? 'traveller' : 'travellers'}):
            </div>
            <div className={styles.scenarioGrid}>
              {scenarios.map((s) => (
                <button
                  key={s.tier}
                  type="button"
                  className={`${styles.scenarioCard} ${values.budgetTier === s.tier ? styles.scenarioCardActive : ''}`}
                  onClick={() => onChange({ budgetTier: s.tier })}
                >
                  <div className={styles.scenarioTitle}>{s.title}</div>
                  <div className={styles.scenarioPrice}>{formatCurrency(s.total)}</div>
                  {values.budgetTier === s.tier && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.2rem', fontWeight: 600 }}>
                      <Check size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* <div className={styles.dates}>
          <Field label="Travel to destination (optional)" error={errors.travelToDestinationCost} hint="Return flights, trains, or other travel for the whole group.">
            {(control) => (
              <input {...control} type="number" inputMode="numeric" min="0" max="1000000" step="500" placeholder="e.g. 12000" value={values.travelToDestinationCost ?? ''} onChange={(event) => onChange({ travelToDestinationCost: event.target.value === '' ? undefined : Number(event.target.value) })} />
            )}
          </Field>
          <Field label="Contingency (optional)" error={errors.contingencyPercent} hint="Added on top of the total for unexpected costs.">
            {(control) => (
              <input {...control} type="number" inputMode="numeric" min="0" max="30" step="1" placeholder="e.g. 10" value={values.contingencyPercent ?? ''} onChange={(event) => onChange({ contingencyPercent: event.target.value === '' ? undefined : Number(event.target.value) })} />
            )}
          </Field>
        </div> */}
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
