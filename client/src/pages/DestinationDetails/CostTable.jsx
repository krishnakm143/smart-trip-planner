import { formatCurrency } from '../../utils/formatCurrency'
import { BUDGET_TIERS } from '../../utils/constants'
import styles from './CostTable.module.css'

const ROWS = [
  { key: 'stay', label: 'Stay', basis: 'per room, per night' },
  { key: 'food', label: 'Food', basis: 'per person, per day' },
  { key: 'transport', label: 'Local transport', basis: 'per person, per day' },
]

const dayForTwo = (cost) => cost.stay + 2 * (cost.food + cost.transport)

export default function CostTable({ dailyCost }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className="visually-hidden">Daily costs by budget tier, in rupees</caption>
        <thead>
          <tr>
            <td />
            {BUDGET_TIERS.map((tier) => (
              <th key={tier.value} scope="col">
                {tier.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row">
                {row.label}
                <span className={styles.basis}>{row.basis}</span>
              </th>
              {BUDGET_TIERS.map((tier) => (
                <td key={tier.value} className="numeric">
                  {formatCurrency(dailyCost[tier.value][row.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">
              A day for two
              <span className={styles.basis}>one room, food and transport</span>
            </th>
            {BUDGET_TIERS.map((tier) => (
              <td key={tier.value} className="numeric">
                {formatCurrency(dayForTwo(dailyCost[tier.value]))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
