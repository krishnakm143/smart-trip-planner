import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Share2, MapPin, ArrowRight } from 'lucide-react'
import DestinationImage from '../DestinationImage/DestinationImage'
import StatusBadge from '../ui/StatusBadge'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateRange } from '../../utils/formatDate'
import { labelFor } from '../../utils/constants'
import { duplicateTrip } from '../../services/tripService'
import { useToast } from '../../context/ToastContext'
import styles from './TripCard.module.css'

/** Renders a compact budget utilization bar if expense data is available on the trip. */
function BudgetUtilizationBar({ trip }) {
  const budgetTotal = trip.budget?.total || 0
  const totalSpent = trip.totalSpent ?? null // server may include this field in list response
  if (!budgetTotal || totalSpent === null) return null

  const pct = Math.min(Math.round((totalSpent / budgetTotal) * 100), 100)
  const isOver = totalSpent > budgetTotal
  const barColor = isOver ? 'var(--danger, #a2332a)' : pct > 80 ? '#d97706' : 'var(--success, #2c6a3d)'

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '2px' }}>
        <span>Budget used</span>
        <span style={{ fontWeight: 600, color: barColor }}>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of budget used`}
        style={{ height: '4px', borderRadius: '2px', background: 'var(--line)', overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '2px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}

export default function TripCard({ trip, onDuplicated }) {
  const { destination } = trip
  const { notify } = useToast()
  const [copying, setCopying] = useState(false)

  async function handleDuplicate(e) {
    e.preventDefault()
    e.stopPropagation()
    setCopying(true)
    try {
      const copy = await duplicateTrip(trip.id)
      notify(`Trip duplicated as "${copy.title}"`)
      onDuplicated?.()
    } catch (err) {
      notify(err.message || 'Could not duplicate trip', 'error')
    } finally {
      setCopying(false)
    }
  }

  function handleShare(e) {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/trips/${trip.id}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      notify('Trip link copied to clipboard!')
    }
  }

  return (
    <article className={styles.card}>
      <Link to={`/trips/${trip.id}`} className={styles.cardTop}>
        <div className={styles.media}>
          <DestinationImage src={destination.heroImage} name={destination.name} />
        </div>
        <div className={styles.body}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={trip.status} />
            {trip.tripMode && (
              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', background: '#f1f5f9', borderRadius: '4px', textTransform: 'capitalize', color: '#475569' }}>
                {trip.tripMode}
              </span>
            )}
          </div>
          <h2 className={styles.title}>{trip.title}</h2>
          <p className={styles.place}>
            <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
            {trip.origin ? `${trip.origin} ➔ ` : ''}
            {destination.name}, {destination.state}
          </p>
          <dl className={styles.facts}>
            <div>
              <dt>Dates</dt>
              <dd>{formatDateRange(trip.startDate, trip.endDate)}</dd>
            </div>
            <div>
              <dt>Group</dt>
              <dd>
                {trip.travelers} {trip.travelers === 1 ? 'traveller' : 'travellers'}, {labelFor(trip.budgetTier).toLowerCase()}
              </dd>
            </div>
            <div>
              <dt>Estimated total</dt>
              <dd className={`${styles.total} numeric`}>{formatCurrency(trip.budget.total)}</dd>
            </div>
          </dl>
          <BudgetUtilizationBar trip={trip} />
        </div>
      </Link>
      <div className={styles.cardActions}>
        <button type="button" className={styles.actionBtn} onClick={handleShare} title="Copy trip link">
          <Share2 size={13} />
          <span>Share</span>
        </button>
        <button type="button" className={styles.actionBtn} onClick={handleDuplicate} disabled={copying} title="Create a duplicate copy of this trip">
          <Copy size={13} />
          <span>{copying ? 'Duplicating…' : 'Duplicate'}</span>
        </button>
        <Link to={`/trips/${trip.id}`} className={styles.actionBtn} style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}>
          <span>Open Plan</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  )
}
