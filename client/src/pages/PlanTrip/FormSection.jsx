import styles from './FormSection.module.css'

export default function FormSection({ title, description, children }) {
  return (
    <section className={styles.section}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <div className={styles.controls}>{children}</div>
    </section>
  )
}
