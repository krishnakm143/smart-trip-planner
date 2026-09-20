import { RotateCw } from 'lucide-react'
import Button from '../ui/Button'
import styles from './states.module.css'

export default function ErrorState({ title = 'This did not load', error, onRetry }) {
  return (
    <div className={styles.state} role="alert">
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{error?.message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
