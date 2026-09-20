import { Link } from 'react-router-dom'
import DestinationImage from '../../components/DestinationImage/DestinationImage'
import StatusBadge from '../../components/ui/StatusBadge'
import styles from './TripHero.module.css'

export default function TripHero({ trip }) {
  const { destination } = trip

  return (
    <header className={styles.hero}>
      <DestinationImage src={destination.heroImage} name={destination.name} eager className={styles.image} />
      <div className={styles.scrim} />
      <div className={`container ${styles.text}`}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link to="/trips">My trips</Link>
        </nav>
        <h1 className={styles.title}>{trip.title}</h1>
        <p className={styles.place}>
          <StatusBadge status={trip.status} />
          <Link to={`/destinations/${destination.slug}`}>
            {destination.name}, {destination.state}
          </Link>
        </p>
      </div>
    </header>
  )
}
