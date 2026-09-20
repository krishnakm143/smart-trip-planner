import { Car, Coffee, Utensils } from 'lucide-react'
import { formatWeekday } from '../../utils/formatDate'
import { formatFee } from '../../utils/formatCurrency'
import { describeBreaks, formatClock, formatDuration, formatKm } from '../../utils/time'
import { labelFor } from '../../utils/constants'
import styles from './ItineraryDay.module.css'

function TravelLeg({ minutes, km }) {
  return (
    <li className={styles.leg}>
      <span className={styles.legRail} aria-hidden="true" />
      <p className={styles.legText}>
        <Car aria-hidden="true" />
        <span className="visually-hidden">Travel to the next stop:</span>
        {minutes} min · {formatKm(km)}
      </p>
    </li>
  )
}

function Break({ kind, label }) {
  const Icon = kind === 'lunch' ? Utensils : Coffee
  return (
    <li className={styles.lunch}>
      <span className={styles.legRail} aria-hidden="true" />
      <p className={styles.lunchText}>
        <Icon aria-hidden="true" />
        {label}
      </p>
    </li>
  )
}

function Stop({ item, position }) {
  return (
    <li className={styles.stop}>
      <p className={styles.time}>
        <time>{formatClock(item.startTime)}</time>
        <span className={styles.timeEnd}>
          to <time>{formatClock(item.endTime)}</time>
        </span>
      </p>
      <span className={styles.marker} aria-hidden="true">
        {position}
      </span>
      <div className={styles.stopBody}>
        <h4 className={styles.stopName}>{item.name}</h4>
        <p className={styles.stopMeta}>
          <span className={styles.type}>{labelFor(item.type)}</span>
          <span>{formatDuration(item.durationHours)}</span>
          <span>{formatFee(item.entryFee)}</span>
        </p>
      </div>
    </li>
  )
}

export default function ItineraryDay({ day, headingId }) {
  const { items } = day
  const breaks = describeBreaks(items)

  return (
    <section className={styles.day} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h3 id={headingId} className={styles.title}>
          Day {day.day}
          <span className={styles.date}>{formatWeekday(day.date)}</span>
        </h3>
        {items.length > 0 && (
          <p className={styles.totals}>
            {formatDuration(day.totalVisitHours)} of visits
            {day.totalTravelKm > 0 && `, ${formatKm(day.totalTravelKm)} on the road`}
          </p>
        )}
      </header>

      {items.length === 0 ? (
        <p className={styles.freeDay}>{day.note || 'Free day — explore at your own pace'}</p>
      ) : (
        <ol className={styles.timeline}>
          {items.flatMap((item, index) => {
            const previous = items[index - 1]
            const rows = []
            if (breaks[index]) rows.push(<Break key={`break-${index}`} {...breaks[index]} />)
            if (previous && item.travelMinutesFromPrev > 0) {
              rows.push(
                <TravelLeg key={`leg-${index}`} minutes={item.travelMinutesFromPrev} km={item.travelKmFromPrev} />,
              )
            }
            rows.push(<Stop key={`${item.name}-${item.startTime}`} item={item} position={index + 1} />)
            return rows
          })}
        </ol>
      )}

      {items.length > 0 && day.note && <p className={styles.note}>{day.note}</p>}
    </section>
  )
}
