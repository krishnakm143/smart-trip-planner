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
import styles from './MyTripsPage.module.css'

export default function MyTripsPage() {
  useDocumentTitle('My trips')
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('status') ?? ''
  const status = TRIP_STATUSES.some((option) => option.value === requested) ? requested : ''

  const load = useCallback((signal) => listTrips(status, signal), [status])
  const { data: trips, error, loading, retry } = useResource(load)

  const selectStatus = (value) => setSearchParams(value ? { status: value } : {}, { replace: true })

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.heading}>My trips</h1>
        <Button to="/plan">
          <Plus aria-hidden="true" />
          Plan a trip
        </Button>
      </header>

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
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
