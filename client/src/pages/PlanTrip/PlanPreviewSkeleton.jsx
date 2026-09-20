import Skeleton from '../../components/ui/Skeleton'
import styles from './PlanPreviewSkeleton.module.css'

export default function PlanPreviewSkeleton() {
  return (
    <div role="status" aria-label="Generating your plan">
      <Skeleton height="16rem" />
      <div className={styles.columns}>
        <div className={styles.column}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height="3.5rem" />
          ))}
        </div>
        <Skeleton height="20rem" />
      </div>
    </div>
  )
}
