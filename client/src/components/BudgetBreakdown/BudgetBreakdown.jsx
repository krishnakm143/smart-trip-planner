import { formatCurrency } from '../../utils/formatCurrency'
import { labelFor } from '../../utils/constants'
import styles from './BudgetBreakdown.module.css'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

function describeCategories({ rooms, nights }, travelers, days) {
  const people = plural(travelers, 'traveller')
  return [
    { key: 'stay', label: 'Stay', basis: `${plural(rooms, 'room')} for ${plural(nights, 'night')}` },
    { key: 'food', label: 'Food', basis: `${people}, ${plural(days, 'day')}` },
    { key: 'transport', label: 'Local transport', basis: `${people}, ${plural(days, 'day')}` },
    { key: 'activities', label: 'Activities', basis: `Entry fees for ${people}` },
  ]
}

export default function BudgetBreakdown({ budget, travelers, days }) {
  const { breakdown, total, perPerson, tier } = budget
  const categories = describeCategories(budget, travelers, days).map((category) => ({
    ...category,
    amount: breakdown[category.key],
    share: total > 0 ? (breakdown[category.key] / total) * 100 : 0,
  }))
  const barSummary = categories.map((c) => `${c.label} ${Math.round(c.share)}%`).join(', ')

  return (
    <div className={styles.budget}>
      <div className={styles.headline}>
        <div>
          <p className={styles.caption}>Estimated total, {labelFor(tier).toLowerCase()} tier</p>
          <p className={`${styles.total} numeric`}>{formatCurrency(total)}</p>
        </div>
        <div className={styles.perPerson}>
          <p className={styles.caption}>Per person</p>
          <p className={`${styles.perPersonValue} numeric`}>{formatCurrency(perPerson)}</p>
        </div>
      </div>

      <div className={styles.bar} role="img" aria-label={`Share of total: ${barSummary}`}>
        {categories
          .filter((category) => category.amount > 0)
          .map((category) => (
            <span
              key={category.key}
              className={`${styles.segment} ${styles[category.key]}`}
              style={{ flexGrow: category.amount }}
            />
          ))}
      </div>

      <table className={styles.table}>
        <caption className="visually-hidden">Budget by category</caption>
        <thead className="visually-hidden">
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Share</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.key}>
              <th scope="row">
                <span className={`${styles.swatch} ${styles[category.key]}`} aria-hidden="true" />
                <span>
                  {category.label}
                  <span className={styles.basis}>{category.basis}</span>
                </span>
              </th>
              <td className={`${styles.share} numeric`}>{Math.round(category.share)}%</td>
              <td className={`${styles.amount} numeric`}>{formatCurrency(category.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.footnote}>
        An estimate in rupees. Two travellers share a room; travel to and from the destination is not included.
      </p>
    </div>
  )
}
