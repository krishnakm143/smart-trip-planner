import Skeleton from '../ui/Skeleton'
import styles from './DestinationCard.module.css'

export default function DestinationCardSkeleton() {
  return (
    <div className={styles.skeleton}>
      <Skeleton height="auto" className={styles.skeletonMedia} />
      <Skeleton width="55%" height="1.6rem" />
      <Skeleton width="35%" />
      <Skeleton width="90%" />
    </div>
  )
}
