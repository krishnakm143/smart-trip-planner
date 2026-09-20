import { BookmarkPlus } from 'lucide-react'
import BudgetBreakdown from '../../components/BudgetBreakdown/BudgetBreakdown'
import DestinationImage from '../../components/DestinationImage/DestinationImage'
import Itinerary from '../../components/Itinerary/Itinerary'
import Button from '../../components/ui/Button'
import { formatDateRange } from '../../utils/formatDate'
import { PROVIDER_LABELS, labelFor } from '../../utils/constants'
import styles from './PlanPreview.module.css'

const ROUTE_NOTES = {
  local: 'Distances are straight-line estimates with a road factor, at 25 km/h.',
  google: 'Driving times come from Google Distance Matrix.',
}

export default function PlanPreview({ plan, input, stale, restored, signedIn, saving, onSave }) {
  const { destination, days, itinerary, budget, provider } = plan
  const stops = itinerary.reduce((count, day) => count + day.items.length, 0)

  return (
    <section aria-labelledby="preview-heading" className={styles.preview}>
      <header className={styles.banner}>
        <DestinationImage src={destination.heroImage} name={destination.name} className={styles.bannerImage} />
        <div className={styles.bannerScrim} />
        <div className={styles.bannerText}>
          <h2 id="preview-heading" className={styles.title}>
            {days} {days === 1 ? 'day' : 'days'} in {destination.name}
          </h2>
          <p>
            {formatDateRange(input.startDate, input.endDate)}, {input.travelers}{' '}
            {input.travelers === 1 ? 'traveller' : 'travellers'}, {labelFor(input.pace).toLowerCase()} pace, {stops} stops
          </p>
        </div>
      </header>

      {restored && signedIn && (
        <p className={styles.notice} role="status">
          You are signed in and your plan is back. Save it to keep it in My trips.
        </p>
      )}
      {stale && (
        <p className={styles.notice} role="status">
          The form has changed since this plan was generated. Generate again to update it, or save this version.
        </p>
      )}

      <div className={styles.columns}>
        <div>
          <h3 className={styles.columnHeading}>Itinerary</h3>
          <Itinerary days={itinerary} />
          <p className={styles.provider}>
            Routes by <span className={styles.providerBadge}>{PROVIDER_LABELS[provider] ?? provider}</span>
            {ROUTE_NOTES[provider]}
          </p>
        </div>

        <aside className={styles.side} aria-label="Budget and save">
          <h3 className={styles.columnHeading}>Budget</h3>
          <BudgetBreakdown budget={budget} travelers={input.travelers} days={days} />
          <div className={styles.save}>
            <Button size="lg" onClick={onSave} busy={saving} className={styles.saveButton}>
              <BookmarkPlus aria-hidden="true" />
              {saving ? 'Saving trip' : 'Save trip'}
            </Button>
            {!signedIn && <p className={styles.saveHint}>You will be asked to log in first. Your plan is kept while you do.</p>}
          </div>
        </aside>
      </div>
    </section>
  )
}
