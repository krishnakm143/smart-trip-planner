import DestinationImage from '../../components/DestinationImage/DestinationImage'
import styles from './AuthLayout.module.css'

export default function AuthLayout({ title, intro, notice, children, footer }) {
  return (
    <div className={`container ${styles.layout}`}>
      <div className={styles.panel}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        {children}
        <p className={styles.footer}>{footer}</p>
      </div>
      <figure className={styles.figure}>
        <DestinationImage src="/images/destinations/varanasi.jpg" name="Varanasi" alt="" eager />
        <figcaption className={styles.caption}>Ghats on the Ganga, Varanasi</figcaption>
      </figure>
    </div>
  )
}
