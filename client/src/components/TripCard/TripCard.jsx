import { Link } from 'react-router-dom'
import DestinationImage from '../DestinationImage/DestinationImage'
import StatusBadge from '../ui/StatusBadge'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDateRange } from '../../utils/formatDate'
import { labelFor } from '../../utils/constants'
import styles from './TripCard.module.css'

export default function TripCard({ trip }) {
  const { destination } = trip

  return (
    <article className={styles.card}>
      <Link to={`/trips/${trip.id}`} className={styles.link}>
        <div className={styles.media}>
          <DestinationImage src={destination.heroImage} name={destination.name} />
        </div>
        <div className={styles.body}>
          <StatusBadge status={trip.status} />
          <h2 className={styles.title}>{trip.title}</h2>
          <p className={styles.place}>
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
        </div>
      </Link>
    </article>
  )
}
