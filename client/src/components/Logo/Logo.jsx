import styles from './Logo.module.css'

/**
 * Brand mark and wordmark. The arch repeats the shape of the hero photograph;
 * inside it a dotted route climbs to a map pin.
 */
export default function Logo({ onDark = false, className = '' }) {
  return (
    <span className={`${styles.logo} ${onDark ? styles.onDark : ''} ${className}`}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className={styles.mark}>
        <path className={styles.arch} d="M6 38V19a14 14 0 0 1 28 0v19z" />
        <path className={styles.route} d="M12 33c5.5 0 3-6.5 8-6.5 2 0 3.4-.6 4.5-1.9" />
        <circle className={styles.start} cx="12" cy="33" r="2" />
        <path className={styles.pin} d="M24.5 24.6c-3.7-4.4-5.5-7-5.5-9.7a5.5 5.5 0 0 1 11 0c0 2.7-1.8 5.3-5.5 9.7z" />
        <circle className={styles.pinEye} cx="24.5" cy="14.8" r="2" />
      </svg>
      <span className={styles.wordmark}>
        Smart Trip <span className={styles.accent}>Planner</span>
      </span>
    </span>
  )
}
