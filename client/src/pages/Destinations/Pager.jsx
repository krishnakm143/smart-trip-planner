import Button from '../../components/ui/Button'
import styles from './DestinationsPage.module.css'

export default function Pager({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null

  return (
    <nav className={styles.pager} aria-label="Pages">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {pageCount}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  )
}
