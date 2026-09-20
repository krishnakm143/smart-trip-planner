import { formatDateRange } from '../../utils/formatDate'
import { labelFor } from '../../utils/constants'
import styles from './TripSummary.module.css'

export default function TripSummary({ trip }) {
  const nights = trip.budget.nights
  const facts = [
    { label: 'Dates', value: formatDateRange(trip.startDate, trip.endDate) },
    { label: 'Length', value: `${trip.days} ${trip.days === 1 ? 'day' : 'days'}, ${nights} ${nights === 1 ? 'night' : 'nights'}` },
    { label: 'Travellers', value: trip.travelers },
    { label: 'Budget tier', value: labelFor(trip.budgetTier) },
    { label: 'Pace', value: labelFor(trip.pace) },
    { label: 'Interests', value: trip.interests.length > 0 ? trip.interests.map(labelFor).join(', ') : 'No preference' },
  ]

  return (
    <dl className={styles.summary}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
