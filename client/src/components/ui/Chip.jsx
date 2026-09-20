import styles from './Chip.module.css'

export default function Chip({ selected, onToggle, children }) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {children}
    </button>
  )
}
