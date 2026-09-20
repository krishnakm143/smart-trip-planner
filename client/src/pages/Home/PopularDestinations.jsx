import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import DestinationCard from '../../components/DestinationCard/DestinationCard'
import DestinationCardSkeleton from '../../components/DestinationCard/DestinationCardSkeleton'
import ErrorState from '../../components/states/ErrorState'
import { useResource } from '../../hooks/useResource'
import { listDestinations } from '../../services/destinationService'
import styles from './PopularDestinations.module.css'

const SHOWN = 5

export default function PopularDestinations() {
  const load = useCallback(
    (signal) =>
      listDestinations({ limit: 12 }, signal).then((data) =>
        [...data.items].sort((a, b) => b.rating - a.rating).slice(0, SHOWN),
      ),
    [],
  )
  const { data: destinations, error, loading, retry } = useResource(load)

  return (
    <section className={`container ${styles.section}`} aria-labelledby="popular-heading">
      <div className={styles.header}>
        <h2 id="popular-heading" className={styles.heading}>
          Where travellers are heading
        </h2>
        <Link to="/destinations" className="text-link">
          See all twelve destinations
        </Link>
      </div>

      {error && <ErrorState title="Destinations did not load" error={error} onRetry={retry} />}

      {!error && (
        <div className={styles.grid} aria-busy={loading}>
          {loading
            ? Array.from({ length: SHOWN }, (_, index) => (
                <div key={index} className={index === 0 ? styles.lead : undefined}>
                  <DestinationCardSkeleton />
                </div>
              ))
            : destinations.map((destination, index) => (
                <div key={destination.id} className={index === 0 ? styles.lead : undefined}>
                  <DestinationCard destination={destination} featured={index === 0} />
                </div>
              ))}
        </div>
      )}
    </section>
  )
}
