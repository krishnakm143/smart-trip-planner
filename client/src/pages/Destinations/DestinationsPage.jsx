import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DestinationCard from '../../components/DestinationCard/DestinationCard'
import DestinationCardSkeleton from '../../components/DestinationCard/DestinationCardSkeleton'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Button from '../../components/ui/Button'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { findNearestDestinations, listDestinations } from '../../services/destinationService'
import DestinationFilters from './DestinationFilters'
import Pager from './Pager'
import styles from './DestinationsPage.module.css'

const PAGE_SIZE = 12

const locationMessage = (error) => {
  if (error?.code === 1) return 'Location access was not allowed. You can still search by destination or state.'
  if (error?.code === 2) return 'Your location is unavailable right now. Please try again.'
  if (error?.code === 3) return 'Finding your location took too long. Please try again.'
  return 'Location is not available in this browser. You can still search by destination or state.'
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 5 * 60 * 1000,
      timeout: 10_000,
    })
  })
}

export default function DestinationsPage() {
  useDocumentTitle('Destinations')
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const [searchText, setSearchText] = useState(search)
  const [nearby, setNearby] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          Object.entries(changes).forEach(([key, value]) => {
            if (value) next.set(key, value)
            else next.delete(key)
          })
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const [commitSearch, cancelPendingSearch] = useDebouncedCallback((text) =>
    updateParams({ search: text.trim(), page: '' }),
  )

  function handleSearchChange(text) {
    setNearby(null)
    setLocationError('')
    setSearchText(text)
    commitSearch(text)
  }

  const load = useCallback(
    (signal) => listDestinations({ search, category, page, limit: PAGE_SIZE }, signal),
    [search, category, page],
  )
  const { data, error, loading, retry } = useResource(load)

  function clearFilters() {
    cancelPendingSearch()
    setSearchText('')
    clearNearby()
    updateParams({ search: '', category: '', page: '' })
  }

  async function showNearMe() {
    setLocating(true)
    setLocationError('')
    try {
      const position = await currentPosition()
      const result = await findNearestDestinations({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
      setNearby(result)
      cancelPendingSearch()
      setSearchText('')
      updateParams({ search: '', category: '', page: '' })
    } catch (error) {
      setLocationError(locationMessage(error))
    } finally {
      setLocating(false)
    }
  }

  function clearNearby() {
    setNearby(null)
    setLocationError('')
  }

  const hasFilters = Boolean(search || category || nearby)
  const visibleData = nearby ?? data

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Twelve places, from the Rann to the Himalaya</h1>
        <p className={styles.lede}>
          Every destination comes with researched daily costs and eight to ten places worth your time.
        </p>
      </header>

      <DestinationFilters
        searchText={searchText}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={(value) => {
          setNearby(null)
          setLocationError('')
          updateParams({ category: value, page: '' })
        }}
        nearMe={Boolean(nearby)}
        locating={locating}
        locationError={locationError}
        onLocate={showNearMe}
        onClearLocation={clearNearby}
      />

      <p className={styles.count} role="status">
        {loading && !nearby
          ? 'Loading destinations'
          : visibleData
            ? `${visibleData.items.length} ${visibleData.items.length === 1 ? 'destination' : 'destinations'}${nearby ? ' nearest to you' : ''}`
            : ''}
      </p>

      {error && <ErrorState title="Destinations did not load" error={error} onRetry={retry} />}

      {loading && (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      )}

      {visibleData && visibleData.items.length === 0 && (
        <EmptyState
          title="No destination matches that"
          message={
            hasFilters
              ? 'Try a state name such as Kerala or Rajasthan, or clear the filters to see all twelve.'
              : 'The destination list is empty. Run the seed script on the server, then reload.'
          }
        >
          {hasFilters && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </EmptyState>
      )}

      {visibleData && visibleData.items.length > 0 && (
        <>
          <ul className={styles.grid}>
            {visibleData.items.map((destination) => (
              <li key={destination.id}>
                <DestinationCard destination={destination} />
              </li>
            ))}
          </ul>
          {!nearby && (
            <Pager
              page={data.page}
              pageCount={Math.ceil(data.total / data.limit)}
              onChange={(next) => updateParams({ page: next > 1 ? String(next) : '' })}
            />
          )}
        </>
      )}
    </div>
  )
}
