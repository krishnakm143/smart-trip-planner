import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className={`container-narrow ${styles.page}`}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>This road does not go anywhere</h1>
      <p className={styles.text}>The page may have moved, or the address has a typo. These two still work.</p>
      <div className={styles.actions}>
        <Button to="/destinations">Browse destinations</Button>
        <Button to="/" variant="secondary">
          Go to the home page
        </Button>
      </div>
    </div>
  )
}
