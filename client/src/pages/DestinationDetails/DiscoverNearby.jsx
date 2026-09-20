import { useCallback, useState } from 'react'
import { MapPin, Star } from 'lucide-react'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Skeleton from '../../components/ui/Skeleton'
import { useResource } from '../../hooks/useResource'
import { discoverPlaces } from '../../services/destinationService'
import { ACTIVITY_TYPES, PROVIDER_LABELS, labelFor } from '../../utils/constants'
import styles from './DiscoverNearby.module.css'

export default function DiscoverNearby({ slug, headingId }) {
  const [type, setType] = useState('')
  const load = useCallback((signal) => discoverPlaces(slug, type, signal), [slug, type])
  const { data, error, loading, retry } = useResource(load)

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2 id={headingId} className={styles.heading}>
            Discover nearby
          </h2>
          <p className={styles.lede}>More places around town, looked up live when you open this page.</p>
        </div>
        <div className={styles.controls}>
          <label htmlFor="discover-type" className={styles.selectLabel}>
            Show
          </label>
          <select id="discover-type" className={styles.select} value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Everything</option>
            {ACTIVITY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className={styles.grid} role="status" aria-label="Looking up places">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height="4.5rem" />
          ))}
        </div>
      )}

      {error && <ErrorState title="Nearby places did not load" error={error} onRetry={retry} />}

      {data && data.items.length === 0 && (
        <EmptyState
          title={type ? `No ${labelFor(type).toLowerCase()} places found nearby` : 'Nothing found nearby'}
          message="Try a different type from the list above."
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <ul className={styles.grid}>
            {data.items.map((place) => (
              <li key={place.externalId ?? place.name} className={styles.place}>
                <div className={styles.placeHead}>
                  <h3 className={styles.placeName}>{place.name}</h3>
                  {place.rating > 0 && (
                    <span className={styles.rating}>
                      <Star aria-hidden="true" />
                      <span className="visually-hidden">Rated</span>
                      {place.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className={styles.placeMeta}>
                  <span className={styles.type}>{labelFor(place.type)}</span>
                  {place.address && (
                    <span className={styles.address}>
                      <MapPin aria-hidden="true" />
                      {place.address}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className={styles.provider}>
            Source <span className={styles.providerBadge}>{PROVIDER_LABELS[data.provider] ?? data.provider}</span>
          </p>
        </>
      )}
    </>
  )
}
