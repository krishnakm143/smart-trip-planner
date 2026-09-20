import { Printer, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import { TRIP_STATUSES } from '../../utils/constants'
import styles from './TripActions.module.css'

export default function TripActions({ status, onStatusChange, onDelete }) {
  return (
    <div className={styles.actions}>
      <div className={styles.status}>
        <label htmlFor="trip-status">Status</label>
        <select id="trip-status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
          {TRIP_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.buttons}>
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className={styles.delete}>
          <Trash2 aria-hidden="true" />
          Delete trip
        </Button>
      </div>
    </div>
  )
}
