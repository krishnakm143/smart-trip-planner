import Skeleton from '../../components/ui/Skeleton'
import styles from './DestinationDetailsSkeleton.module.css'

export default function DestinationDetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading destination">
      <Skeleton height="clamp(22rem, 62vh, 38rem)" className={styles.hero} />
      <div className={`container ${styles.body}`}>
        <Skeleton width="12rem" height="2.2rem" />
        <Skeleton />
        <Skeleton />
        <Skeleton width="70%" />
      </div>
    </div>
  )
}
