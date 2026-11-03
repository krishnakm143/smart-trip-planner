import { Link } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'
import DestinationImage from '../DestinationImage/DestinationImage'
import { formatCurrency } from '../../utils/formatCurrency'
import { labelFor } from '../../utils/constants'
import styles from './DestinationCard.module.css'

function economyPerPersonPerDay(dailyCost) {
  const economy = dailyCost?.economy || dailyCost?.budget
  if (!economy) return 0
  return Math.round((economy.stay || 0) / 2) + (economy.food || 0) + (economy.transport || 0)
}

export default function DestinationCard({ destination, featured = false, headingLevel = 'h2' }) {
  const {
    slug,
    name,
    state,
    category,
    tagline,
    heroImage,
    rating,
    idealDays,
    dailyCost,
    distanceKm,
    drivingMinutes,
    distanceType,
  } = destination
  const HeadingTag = headingLevel

  return (
    <article className={`${styles.card} ${featured ? styles.featured : ''}`}>
      <Link to={`/destinations/${slug}`} className={styles.link}>
        <div className={styles.media}>
          <DestinationImage src={heroImage} name={name} />
          <span className={styles.category}>{labelFor(category)}</span>
        </div>
        <div className={styles.body}>
          <div className={styles.heading}>
            <HeadingTag className={styles.name}>{name}</HeadingTag>
            <span className={styles.rating}>
              <Star aria-hidden="true" />
              <span className="visually-hidden">Rated</span>
              {rating.toFixed(1)}
            </span>
          </div>
          <p className={styles.state}>{state}</p>
          {typeof distanceKm === 'number' && (
            <p className={styles.distance}>
              <MapPin aria-hidden="true" /> {distanceKm.toLocaleString('en-IN')} km {distanceType === 'road' ? 'by road' : 'away'}
              {typeof drivingMinutes === 'number' && drivingMinutes > 0 && (
                <span className={styles.driveTime}>
                  {' '}(~{drivingMinutes >= 60 ? `${(drivingMinutes / 60).toFixed(drivingMinutes % 60 === 0 ? 0 : 1)}h` : `${drivingMinutes}m`} drive)
                </span>
              )}
            </p>
          )}
          <p className={styles.tagline}>{tagline}</p>
          <p className={styles.facts}>
            <span>
              {idealDays.min}–{idealDays.max} days
            </span>
            <span>from {formatCurrency(economyPerPersonPerDay(dailyCost))} a day per person</span>
          </p>
        </div>
      </Link>
    </article>
  )
}
