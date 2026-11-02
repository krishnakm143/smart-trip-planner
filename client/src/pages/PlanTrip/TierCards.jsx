import { formatCurrency } from '../../utils/formatCurrency'
import { BUDGET_TIERS } from '../../utils/constants'
import styles from './TierCards.module.css'

function costPerDay(cost, travelers) {
  if (!cost) return 0
  const rooms = Math.ceil(travelers / 2)
  return (cost.stay ?? 0) * rooms + ((cost.food ?? 0) + (cost.transport ?? 0)) * travelers
}

export default function TierCards({ value, error, dailyCost, travelers, onChange, maxBudget, days = 3 }) {
  const groupLabel = travelers === 1 ? 'a day for 1 traveller' : `a day for ${travelers} travellers`

  return (
    <fieldset className={styles.group} aria-describedby={error ? 'tier-error' : undefined}>
      <legend className="visually-hidden">Budget tier</legend>
      <div className={styles.cards}>
        {BUDGET_TIERS.map((tier) => {
          const cost = dailyCost?.[tier.value] || (tier.value === 'economy' ? dailyCost?.budget : undefined)
          const dailyTotal = cost ? costPerDay(cost, travelers) : 0
          const tripTotal = dailyTotal * days

          return (
            <label key={tier.value} className={styles.card}>
              <input
                type="radio"
                name="budgetTier"
                className="visually-hidden"
                value={tier.value}
                checked={value === tier.value}
                onChange={() => onChange(tier.value)}
              />
              <span className={styles.name}>{tier.label}</span>
              {cost ? (
                <>
                  <span className={`${styles.price} numeric`}>{formatCurrency(dailyTotal)}</span>
                  <span className={styles.basis}>{groupLabel}</span>
                  <span className={styles.parts}>
                    Room {formatCurrency(cost.stay ?? 0)} a night. Food and transport{' '}
                    {formatCurrency((cost.food ?? 0) + (cost.transport ?? 0))} per person.
                  </span>
                  {maxBudget ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        marginTop: '0.35rem',
                        display: 'inline-block',
                        background: tripTotal <= maxBudget ? '#dcfce7' : '#fee2e2',
                        color: tripTotal <= maxBudget ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {tripTotal <= maxBudget
                        ? `✓ Fits budget (saves ${formatCurrency(maxBudget - tripTotal)})`
                        : `Exceeds by ${formatCurrency(tripTotal - maxBudget)}`}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className={styles.basis}>Choose a destination to see daily costs.</span>
              )}
              <span className={styles.summary}>{tier.summary}</span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id="tier-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
