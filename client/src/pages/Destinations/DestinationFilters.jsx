import { LocateFixed, Search, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import Chip from '../../components/ui/Chip'
import { CATEGORIES } from '../../utils/constants'
import styles from './DestinationFilters.module.css'

export default function DestinationFilters({
  searchText,
  onSearchChange,
  category,
  onCategoryChange,
  nearMe,
  locating,
  locationError,
  onLocate,
  onClearLocation,
}) {
  return (
    <form className={styles.filters} role="search" onSubmit={(event) => event.preventDefault()}>
      <div className={styles.search}>
        <label htmlFor="destination-search" className="visually-hidden">
          Search destinations
        </label>
        <Search aria-hidden="true" className={styles.searchIcon} />
        <input
          id="destination-search"
          type="search"
          className={styles.searchInput}
          placeholder="Search by place, state or tag"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          autoComplete="off"
        />
      </div>

      <fieldset className={styles.categories}>
        <legend className="visually-hidden">Filter by category</legend>
        <Chip selected={category === ''} onToggle={() => onCategoryChange('')}>
          All
        </Chip>
        {CATEGORIES.map((option) => (
          <Chip
            key={option.value}
            selected={category === option.value}
            onToggle={() => onCategoryChange(category === option.value ? '' : option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </fieldset>

      <div className={styles.location}>
        {nearMe ? (
          <>
            <p className={styles.locationStatus} role="status">
              Showing destinations nearest to you (sorted by driving road distance).
            </p>
            <Button variant="ghost" size="sm" onClick={onClearLocation}>
              <X aria-hidden="true" />
              Show all
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={onLocate} busy={locating}>
            <LocateFixed aria-hidden="true" />
            {locating ? 'Finding you' : 'Near me'}
          </Button>
        )}
        {locationError && (
          <p className={styles.locationError} role="alert">
            {locationError}
          </p>
        )}
      </div>
    </form>
  )
}
