import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Star, Sun } from 'lucide-react'
import DestinationImage from '../../components/DestinationImage/DestinationImage'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { getDestination } from '../../services/destinationService'
import { labelFor } from '../../utils/constants'
import ActivityList from './ActivityList'
import CostTable from './CostTable'
import DestinationDetailsSkeleton from './DestinationDetailsSkeleton'
import DiscoverNearby from './DiscoverNearby'
import styles from './DestinationDetailsPage.module.css'

export default function DestinationDetailsPage() {
  const { slug } = useParams()
  const load = useCallback((signal) => getDestination(slug, signal), [slug])
  const { data, error, loading, retry } = useResource(load)
  useDocumentTitle(data?.destination.name ?? 'Destination')

  if (loading) return <DestinationDetailsSkeleton />

  if (error?.status === 404) {
    return (
      <div className={`container ${styles.state}`}>
        <EmptyState title="That destination is not in our list" message="It may have been renamed, or the link is mistyped.">
          <Button to="/destinations">Browse all destinations</Button>
        </EmptyState>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`container ${styles.state}`}>
        <ErrorState title="This destination did not load" error={error} onRetry={retry} />
      </div>
    )
  }

  const { destination, activities } = data
  const planUrl = `/plan?destination=${destination.slug}`

  return (
    <article>
      <header className={styles.hero}>
        <DestinationImage src={destination.heroImage} name={destination.name} alt="" eager className={styles.heroImage} />
        <div className={styles.scrim} />
        <div className={`container ${styles.heroText}`}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link to="/destinations">Destinations</Link>
            <span aria-hidden="true">/</span>
            <span>{labelFor(destination.category)}</span>
          </nav>
          <h1 className={styles.name}>{destination.name}</h1>
          <p className={styles.tagline}>
            {destination.state}, {destination.country}. {destination.tagline}
          </p>
        </div>
      </header>

      <div className={`container ${styles.intro}`}>
        <div>
          <h2 className={styles.sectionHeading}>Overview</h2>
          <p className={styles.description}>{destination.description}</p>
          {destination.tags?.length > 0 && (
            <ul className={styles.tags} aria-label="Known for">
              {destination.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
        </div>

        <aside className={styles.facts} aria-label="Trip facts">
          <dl>
            <div>
              <dt>
                <Sun aria-hidden="true" />
                Best season
              </dt>
              <dd>{destination.bestSeason}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays aria-hidden="true" />
                Ideal stay
              </dt>
              <dd>
                {destination.idealDays.min} to {destination.idealDays.max} days
              </dd>
            </div>
            <div>
              <dt>
                <Star aria-hidden="true" />
                Our rating
              </dt>
              <dd>{destination.rating.toFixed(1)} out of 5</dd>
            </div>
          </dl>
          <Button to={planUrl} size="lg" className={styles.planButton}>
            Plan a trip here
          </Button>
        </aside>
      </div>

      <section className={`container ${styles.section}`} aria-labelledby="cost-heading">
        <h2 id="cost-heading" className={styles.sectionHeading}>
          What a day costs
        </h2>
        <CostTable dailyCost={destination.dailyCost} />
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="activities-heading">
        <h2 id="activities-heading" className={styles.sectionHeading}>
          Places and things to do
        </h2>
        <ActivityList activities={activities} />
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="discover-heading">
        <DiscoverNearby slug={destination.slug} headingId="discover-heading" />
      </section>

      <div className={`container ${styles.closing}`}>
        <p className={styles.closingText}>Ready to turn this into a day-wise plan for {destination.name}?</p>
        <Button to={planUrl} size="lg">
          Plan a trip here
        </Button>
      </div>
    </article>
  )
}
