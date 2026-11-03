import { formatCurrency } from '../../utils/formatCurrency'
import { BUDGET_TIERS } from '../../utils/constants'
import styles from './TierCards.module.css'

export default function TierCards({
  value,
  error,
  dailyCost,
  travelers = 2,
  onChange,
  maxBudget,
  days = 3,
  scenarios = null,
}) {
  return (
    <fieldset className={styles.group} aria-describedby={error ? 'tier-error' : undefined}>
      <legend className="visually-hidden">Budget tier comparison</legend>
      <div className={styles.cards}>
        {BUDGET_TIERS.map((tier) => {
          const scenario = scenarios?.find((s) => s.tier === tier.value)
          const cost = dailyCost?.[tier.value] || (tier.value === 'economy' ? dailyCost?.budget : undefined)

          const rooms = Math.ceil(travelers / 2)
          const nights = Math.max(days - 1, 1)

          const stayCost = scenario ? scenario.breakdown.stay : (cost?.stay ?? 0) * rooms * nights
          const foodCost = scenario ? scenario.breakdown.food : (cost?.food ?? 0) * travelers * days
          const transportCost = scenario ? scenario.breakdown.transport : (cost?.transport ?? 0) * travelers * days
          const activitiesCost = scenario ? scenario.breakdown.activities : 0

          const tripTotal = scenario ? scenario.total : (stayCost + foodCost + transportCost + activitiesCost)
          const dailyTotal = scenario ? scenario.dailyTotal : Math.round(tripTotal / Math.max(1, days))
          const perPerson = scenario ? scenario.perPerson : Math.round(tripTotal / Math.max(1, travelers))

          const isAchievable = scenario ? scenario.isAchievable : maxBudget ? tripTotal <= maxBudget : true
          const diff = maxBudget !== undefined && maxBudget !== null ? maxBudget - tripTotal : null

          return (
            <label
              key={tier.value}
              className={`${styles.card} ${value === tier.value ? styles.cardActive : ''}`}
            >
              <input
                type="radio"
                name="budgetTier"
                className="visually-hidden"
                value={tier.value}
                checked={value === tier.value}
                onChange={() => onChange(tier.value)}
              />

              <div className={styles.cardHeader}>
                <span className={styles.name}>{tier.label}</span>
                {maxBudget && scenario?.target ? (
                  <span className={styles.targetPill}>
                    Target ~{formatCurrency(scenario.target)} ({Math.round(scenario.targetRatio * 100)}%)
                  </span>
                ) : null}
              </div>

              {cost || scenario ? (
                <>
                  <div className={styles.priceContainer}>
                    <span className={`${styles.price} numeric`}>{formatCurrency(tripTotal)}</span>
                    <span className={styles.totalBadge}>total for {days} {days === 1 ? 'day' : 'days'}</span>
                  </div>

                  <span className={styles.basis}>
                    {formatCurrency(dailyTotal)}/day · {formatCurrency(perPerson)}/person
                  </span>

                  {/* Transparent Cost Breakdown */}
                  <div className={styles.breakdownGrid}>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Stay ({nights}n)</span>
                      <span className={styles.breakdownValue}>{formatCurrency(stayCost)}</span>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Food</span>
                      <span className={styles.breakdownValue}>{formatCurrency(foodCost)}</span>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Transport</span>
                      <span className={styles.breakdownValue}>{formatCurrency(transportCost)}</span>
                    </div>
                    <div className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>Activities</span>
                      <span className={styles.breakdownValue}>
                        {activitiesCost > 0 ? formatCurrency(activitiesCost) : 'Free/minimal'}
                      </span>
                    </div>
                  </div>

                  {maxBudget !== undefined && maxBudget !== null && maxBudget > 0 ? (
                    <div
                      className={`${styles.diffBadge} ${
                        isAchievable ? styles.diffBadgeSuccess : styles.diffBadgeDanger
                      }`}
                    >
                      {isAchievable ? (
                        <>✓ Fits budget ({diff > 0 ? `saves ${formatCurrency(diff)}` : 'exact match'})</>
                      ) : (
                        <>⚠️ Exceeds budget by {formatCurrency(Math.abs(diff))}</>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <span className={styles.basis}>Choose a destination to see costs.</span>
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
