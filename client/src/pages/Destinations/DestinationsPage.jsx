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
import { listDestinations } from '../../services/destinationService'
import DestinationFilters from './DestinationFilters'
import Pager from './Pager'
import styles from './DestinationsPage.module.css'

const PAGE_SIZE = 12

export default function DestinationsPage() {
  useDocumentTitle('Destinations')
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const page = Number(searchParams.get('page')) || 1

  const [searchText, setSearchText] = useState(search)

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
    updateParams({ search: '', category: '', page: '' })
  }

  const hasFilters = Boolean(search || category)

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
        onCategoryChange={(value) => updateParams({ category: value, page: '' })}
      />

      <p className={styles.count} role="status">
        {loading ? 'Loading destinations' : data ? `${data.total} ${data.total === 1 ? 'destination' : 'destinations'}` : ''}
      </p>

      {error && <ErrorState title="Destinations did not load" error={error} onRetry={retry} />}

      {loading && (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
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

      {data && data.items.length > 0 && (
        <>
          <ul className={styles.grid}>
            {data.items.map((destination) => (
              <li key={destination.id}>
                <DestinationCard destination={destination} />
              </li>
            ))}
          </ul>
          <Pager
            page={data.page}
            pageCount={Math.ceil(data.total / data.limit)}
            onChange={(next) => updateParams({ page: next > 1 ? String(next) : '' })}
          />
        </>
      )}
    </div>
  )
}
