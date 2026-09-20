import styles from './states.module.css'

export default function EmptyState({ title, message, children }) {
  return (
    <div className={styles.state}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {children}
    </div>
  )
}
