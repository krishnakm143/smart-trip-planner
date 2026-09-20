import { formatCurrency } from '../../utils/formatCurrency'
import { BUDGET_TIERS } from '../../utils/constants'
import styles from './TierCards.module.css'

function costPerDay(cost, travelers) {
  const rooms = Math.ceil(travelers / 2)
  return cost.stay * rooms + (cost.food + cost.transport) * travelers
}

export default function TierCards({ value, error, dailyCost, travelers, onChange }) {
  const groupLabel = travelers === 1 ? 'a day for 1 traveller' : `a day for ${travelers} travellers`

  return (
    <fieldset className={styles.group} aria-describedby={error ? 'tier-error' : undefined}>
      <legend className="visually-hidden">Budget tier</legend>
      <div className={styles.cards}>
        {BUDGET_TIERS.map((tier) => {
          const cost = dailyCost?.[tier.value]
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
                  <span className={`${styles.price} numeric`}>{formatCurrency(costPerDay(cost, travelers))}</span>
                  <span className={styles.basis}>{groupLabel}</span>
                  <span className={styles.parts}>
                    Room {formatCurrency(cost.stay)} a night. Food and transport{' '}
                    {formatCurrency(cost.food + cost.transport)} per person.
                  </span>
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
