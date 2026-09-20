import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import DestinationImage from '../DestinationImage/DestinationImage'
import { formatCurrency } from '../../utils/formatCurrency'
import { labelFor } from '../../utils/constants'
import styles from './DestinationCard.module.css'

function economyPerPersonPerDay({ economy }) {
  return Math.round(economy.stay / 2) + economy.food + economy.transport
}

export default function DestinationCard({ destination, featured = false }) {
  const { slug, name, state, category, tagline, heroImage, rating, idealDays, dailyCost } = destination

  return (
    <article className={`${styles.card} ${featured ? styles.featured : ''}`}>
      <Link to={`/destinations/${slug}`} className={styles.link}>
        <div className={styles.media}>
          <DestinationImage src={heroImage} name={name} />
          <span className={styles.category}>{labelFor(category)}</span>
        </div>
        <div className={styles.body}>
          <div className={styles.heading}>
            <h3 className={styles.name}>{name}</h3>
            <span className={styles.rating}>
              <Star aria-hidden="true" />
              <span className="visually-hidden">Rated</span>
              {rating.toFixed(1)}
            </span>
          </div>
          <p className={styles.state}>{state}</p>
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
