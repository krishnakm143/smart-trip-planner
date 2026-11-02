import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { formatCurrency } from '../../utils/formatCurrency'
import { labelFor } from '../../utils/constants'
import Button from '../ui/Button'
import Dialog from '../ui/Dialog'
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

export default function BudgetBreakdown({ budget, travelers, days, destination }) {
  const [showMatrix, setShowMatrix] = useState(false)
  const { breakdown, total, perPerson, tier, target, difference, isWithinTarget } = budget
  const optionalCategories = [
    ...(breakdown.intercityTravel !== undefined ? [{ key: 'intercityTravel', label: 'Travel to destination', basis: 'Return travel for the whole group' }] : []),
    ...(breakdown.contingency !== undefined ? [{ key: 'contingency', label: 'Contingency', basis: 'Set aside for unexpected costs' }] : []),
  ]
  const categories = [...describeCategories(budget, travelers, days), ...optionalCategories].map((category) => ({
    ...category,
    amount: breakdown[category.key],
    share: total > 0 ? (breakdown[category.key] / total) * 100 : 0,
  }))
  const barSummary = categories.map((c) => `${c.label} ${Math.round(c.share)}%`).join(', ')

  // Calculate tier scenarios if destination dailyCost is available
  const dailyCost = destination?.dailyCost
  const rooms = budget.rooms || Math.ceil((travelers || 2) / 2)
  const nights = budget.nights || Math.max(days - 1, 1)
  const activitiesAmount = breakdown.activities || 0
  const travelCost = breakdown.intercityTravel || 0

  function getTierTotals(tKey) {
    if (!dailyCost) return null
    const c = dailyCost[tKey] || dailyCost[tKey === 'economy' ? 'budget' : tKey]
    if (!c) return null
    const stay = (c.stay || 0) * rooms * nights
    const food = (c.food || 0) * (travelers || 2) * days
    const transport = (c.transport || 0) * (travelers || 2) * days
    const subtotal = stay + food + transport + activitiesAmount + travelCost
    const contingency = breakdown.contingency !== undefined ? Math.round(subtotal * 0.1) : 0
    const tierTotal = subtotal + contingency
    return {
      stay,
      food,
      transport,
      activities: activitiesAmount,
      travelCost,
      contingency,
      total: tierTotal,
      perPerson: Math.round(tierTotal / (travelers || 1)),
    }
  }

  const economyTotals = getTierTotals('economy')
  const standardTotals = getTierTotals('standard')
  const luxuryTotals = getTierTotals('luxury')

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

      {Number.isInteger(target) && (
        <p className={`${styles.target} ${isWithinTarget ? styles.within : styles.over}`}>
          {isWithinTarget
            ? `${formatCurrency(difference)} left within your ${formatCurrency(target)} trip budget.`
            : `${formatCurrency(Math.abs(difference))} over your ${formatCurrency(target)} trip budget.`}
        </p>
      )}

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
        An estimate in rupees. Two travellers share a room;{' '}
        {breakdown.intercityTravel === undefined
          ? 'travel to and from the destination is not included.'
          : 'your supplied travel-to-destination cost is included.'}
      </p>

      {dailyCost && (
        <div className={styles.compareBtnWrapper}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMatrix(true)}
          >
            <BarChart3 size={14} aria-hidden="true" />
            Compare All Budget Tiers
          </Button>
        </div>
      )}

      {showMatrix && dailyCost && (
        <Dialog
          title="Compare Budget Tiers"
          description={`Side-by-side comparison for ${destination.name} (${days} days, ${travelers} ${travelers === 1 ? 'traveller' : 'travellers'}).`}
          onClose={() => setShowMatrix(false)}
        >
          <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
            <table className={styles.matrixTable}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className={tier === 'budget' || tier === 'economy' ? styles.activeTierHeader : ''}>
                    Economical {tier === 'budget' || tier === 'economy' ? '✓' : ''}
                  </th>
                  <th className={tier === 'standard' ? styles.activeTierHeader : ''}>
                    Standard {tier === 'standard' ? '✓' : ''}
                  </th>
                  <th className={tier === 'luxury' ? styles.activeTierHeader : ''}>
                    Premium {tier === 'luxury' ? '✓' : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Stay ({rooms} {rooms === 1 ? 'room' : 'rooms'}, {nights} {nights === 1 ? 'night' : 'nights'})</td>
                  <td className={tier === 'budget' || tier === 'economy' ? styles.activeTierCell : ''}>
                    {economyTotals ? formatCurrency(economyTotals.stay) : '—'}
                  </td>
                  <td className={tier === 'standard' ? styles.activeTierCell : ''}>
                    {standardTotals ? formatCurrency(standardTotals.stay) : '—'}
                  </td>
                  <td className={tier === 'luxury' ? styles.activeTierCell : ''}>
                    {luxuryTotals ? formatCurrency(luxuryTotals.stay) : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Food & Dining</td>
                  <td className={tier === 'budget' || tier === 'economy' ? styles.activeTierCell : ''}>
                    {economyTotals ? formatCurrency(economyTotals.food) : '—'}
                  </td>
                  <td className={tier === 'standard' ? styles.activeTierCell : ''}>
                    {standardTotals ? formatCurrency(standardTotals.food) : '—'}
                  </td>
                  <td className={tier === 'luxury' ? styles.activeTierCell : ''}>
                    {luxuryTotals ? formatCurrency(luxuryTotals.food) : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Local Transport</td>
                  <td className={tier === 'budget' || tier === 'economy' ? styles.activeTierCell : ''}>
                    {economyTotals ? formatCurrency(economyTotals.transport) : '—'}
                  </td>
                  <td className={tier === 'standard' ? styles.activeTierCell : ''}>
                    {standardTotals ? formatCurrency(standardTotals.transport) : '—'}
                  </td>
                  <td className={tier === 'luxury' ? styles.activeTierCell : ''}>
                    {luxuryTotals ? formatCurrency(luxuryTotals.transport) : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Activities & Entry Fees</td>
                  <td>{formatCurrency(activitiesAmount)}</td>
                  <td>{formatCurrency(activitiesAmount)}</td>
                  <td>{formatCurrency(activitiesAmount)}</td>
                </tr>
                {travelCost > 0 && (
                  <tr>
                    <td>Travel to Destination</td>
                    <td>{formatCurrency(travelCost)}</td>
                    <td>{formatCurrency(travelCost)}</td>
                    <td>{formatCurrency(travelCost)}</td>
                  </tr>
                )}
                <tr className={styles.totalRow}>
                  <td>Estimated Total</td>
                  <td className={tier === 'budget' || tier === 'economy' ? styles.activeTierCell : ''}>
                    {economyTotals ? formatCurrency(economyTotals.total) : '—'}
                  </td>
                  <td className={tier === 'standard' ? styles.activeTierCell : ''}>
                    {standardTotals ? formatCurrency(standardTotals.total) : '—'}
                  </td>
                  <td className={tier === 'luxury' ? styles.activeTierCell : ''}>
                    {luxuryTotals ? formatCurrency(luxuryTotals.total) : '—'}
                  </td>
                </tr>
                <tr style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <td>Per Person</td>
                  <td>{economyTotals ? formatCurrency(economyTotals.perPerson) : '—'}</td>
                  <td>{standardTotals ? formatCurrency(standardTotals.perPerson) : '—'}</td>
                  <td>{luxuryTotals ? formatCurrency(luxuryTotals.perPerson) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button size="sm" onClick={() => setShowMatrix(false)}>
              Done
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
