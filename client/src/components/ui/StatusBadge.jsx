import { labelFor } from '../../utils/constants'
import styles from './StatusBadge.module.css'

export default function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[status] ?? ''}`}>{labelFor(status)}</span>
}
