import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TripCard from '../../components/TripCard/TripCard'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Button from '../../components/ui/Button'
import Chip from '../../components/ui/Chip'
import Skeleton from '../../components/ui/Skeleton'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { listTrips } from '../../services/tripService'
import { TRIP_STATUSES, labelFor } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatCurrency'
import { countDaysInclusive } from '../../utils/formatDate'
import styles from './MyTripsPage.module.css'

export default function MyTripsPage() {
  useDocumentTitle('My trips')
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('status') ?? ''
  const status = TRIP_STATUSES.some((option) => option.value === requested) ? requested : ''

  const load = useCallback((signal) => listTrips(status, signal), [status])
  const { data: trips, error, loading, retry } = useResource(load)

  const selectStatus = (value) => setSearchParams(value ? { status: value } : {}, { replace: true })

  // Calculate portfolio analytics
  const totalTrips = trips?.length || 0
  const totalBudgeted = trips?.reduce((sum, t) => sum + (t.budget?.total || 0), 0) || 0
  const avgTripCost = totalTrips > 0 ? Math.round(totalBudgeted / totalTrips) : 0
  const totalDays = trips?.reduce((sum, t) => sum + (countDaysInclusive(t.startDate, t.endDate) || 0), 0) || 0
  const uniqueDestinations = new Set(trips?.map((t) => t.destination?.id).filter(Boolean)).size

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>My trips</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--ink-soft)', fontSize: 'var(--text-sm)' }}>
            Manage your itineraries, travel reservations, budget splits, and packing checklists.
          </p>
        </div>
        <Button to="/plan">
          <Plus aria-hidden="true" />
          Plan a trip
        </Button>
      </header>

      {trips && trips.length > 0 && (
        <section className={styles.analyticsBar} aria-label="Travel statistics summary">
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Trips</span>
            <span className={styles.statValue}>{totalTrips}</span>
            <span className={styles.statSub}>{uniqueDestinations} destinations</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Days on Road</span>
            <span className={styles.statValue}>{totalDays}</span>
            <span className={styles.statSub}>planned travel days</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Budgeted</span>
            <span className={`${styles.statValue} numeric`}>{formatCurrency(totalBudgeted)}</span>
            <span className={styles.statSub}>across all journeys</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Average Trip Cost</span>
            <span className={`${styles.statValue} numeric`}>{formatCurrency(avgTripCost)}</span>
            <span className={styles.statSub}>per adventure</span>
          </div>
        </section>
      )}

      <fieldset className={styles.filters}>
        <legend className="visually-hidden">Filter by status</legend>
        <Chip selected={status === ''} onToggle={() => selectStatus('')}>
          All
        </Chip>
        {TRIP_STATUSES.map((option) => (
          <Chip key={option.value} selected={status === option.value} onToggle={() => selectStatus(option.value)}>
            {option.label}
          </Chip>
        ))}
      </fieldset>

      {loading && (
        <div className={styles.list} role="status" aria-label="Loading trips">
          <Skeleton height="11rem" />
          <Skeleton height="11rem" />
        </div>
      )}

      {error && <ErrorState title="Your trips did not load" error={error} onRetry={retry} />}

      {trips && trips.length === 0 && (
        <EmptyState
          title={status ? `No ${labelFor(status).toLowerCase()} trips` : 'No trips saved yet'}
          message={
            status
              ? 'Trips appear here once their status matches. Choose All to see every trip.'
              : 'Generate a plan, check the itinerary and budget, then save it. It will show up here.'
          }
        >
          {status ? (
            <Button variant="secondary" onClick={() => selectStatus('')}>
              Show all trips
            </Button>
          ) : (
            <Button to="/plan">Plan your first trip</Button>
          )}
        </EmptyState>
      )}

      {trips && trips.length > 0 && (
        <ul className={styles.list}>
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} onDuplicated={retry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
