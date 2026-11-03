import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import DestinationCard from '../../components/DestinationCard/DestinationCard'
import DestinationCardSkeleton from '../../components/DestinationCard/DestinationCardSkeleton'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Button from '../../components/ui/Button'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { findNearestDestinations, listDestinations, searchExternalDestinations } from '../../services/destinationService'
import DestinationFilters from './DestinationFilters'
import Pager from './Pager'
import styles from './DestinationsPage.module.css'

const PAGE_SIZE = 24

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

  const [externalResults, setExternalResults] = useState([])
  const [externalLoading, setExternalLoading] = useState(false)
  const [externalError, setExternalError] = useState('')

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
    setExternalResults([])
    setExternalError('')
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
    setExternalResults([])
    setExternalError('')
    updateParams({ search: '', category: '', page: '' })
  }

  async function showNearMe() {
    setLocating(true)
    setLocationError('')
    setExternalResults([])
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

  async function handleExternalSearch() {
    const query = searchText.trim() || search.trim()
    if (!query || query.length < 2) return
    setExternalLoading(true)
    setExternalError('')
    try {
      const res = await searchExternalDestinations(query)
      const items = res?.items || []
      setExternalResults(items)
      if (items.length === 0) {
        setExternalError(`No places found for "${query}" via Google/OSM Places API.`)
      }
    } catch (err) {
      setExternalError(err.message || 'Failed to search live Places API')
    } finally {
      setExternalLoading(false)
    }
  }

  const hasFilters = Boolean(search || category || nearby)
  const visibleData = nearby ?? data

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Explore destinations across India & beyond</h1>
        <p className={styles.lede}>
          Discover curated highlights or dynamically search any city, fort, temple hill, or hidden gem via live Places API.
        </p>
      </header>

      <DestinationFilters
        searchText={searchText}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={(value) => {
          setNearby(null)
          setLocationError('')
          setExternalResults([])
          updateParams({ category: value, page: '' })
        }}
        nearMe={Boolean(nearby)}
        locating={locating}
        locationError={locationError}
        onLocate={showNearMe}
        onClearLocation={clearNearby}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBlock: 'var(--space-4)' }}>
        <p className={styles.count} role="status" style={{ margin: 0 }}>
          {loading && !nearby
            ? 'Loading destinations…'
            : visibleData
              ? `${visibleData.items.length} ${visibleData.items.length === 1 ? 'destination' : 'destinations'}${nearby ? ' nearest to you' : ''}`
              : ''}
        </p>

        {(searchText.trim().length >= 2 || search.trim().length >= 2) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExternalSearch}
            busy={externalLoading}
          >
            <Sparkles aria-hidden="true" />
            {externalLoading ? 'Searching Places API…' : `✨ Search live API for "${searchText.trim() || search.trim()}"`}
          </Button>
        )}
      </div>

      {externalError && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {externalError}
        </div>
      )}

      {externalResults.length > 0 && (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--surface-muted, #f8fafc)', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                ✨ Live Places API Results for &ldquo;{searchText.trim() || search.trim()}&rdquo;
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Discovered in real time with live location coordinates and attractions.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setExternalResults([])}>
              Dismiss
            </Button>
          </div>

          <ul className={styles.grid}>
            {externalResults.map((destination) => (
              <li key={destination.slug || destination.name}>
                <DestinationCard destination={{ ...destination, isDynamic: true }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <ErrorState title="Destinations did not load" error={error} onRetry={retry} />}

      {loading && (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      )}

      {visibleData && visibleData.items.length === 0 && externalResults.length === 0 && (
        <EmptyState
          title="No local destination matches that"
          message={
            hasFilters
              ? `We didn't find "${searchText || category}" in local catalog. You can search live Places API to find and plan any city dynamically.`
              : 'The destination list is empty.'
          }
        >
          {(searchText.trim() || search.trim()) && (
            <Button variant="primary" onClick={handleExternalSearch} busy={externalLoading}>
              <Sparkles aria-hidden="true" />
              ✨ Discover &ldquo;{searchText.trim() || search.trim()}&rdquo; via live Places API
            </Button>
          )}
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
              <li key={destination.id || destination.slug}>
                <DestinationCard destination={destination} />
              </li>
            ))}
          </ul>
          {!nearby && data?.total > data?.limit && (
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
