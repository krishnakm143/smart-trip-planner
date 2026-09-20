import { Link } from 'react-router-dom'
import { withBase } from '../../utils/basePath'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div>
          <p className={styles.name}>Smart Trip Planner</p>
          <p className={styles.note}>
            Minor project, MCA Semester III, SVIT Vasad. Built by Udit Mishra, Hardik Vaghela and Vraj Panchal.
          </p>
        </div>
        <ul className={styles.links}>
          <li>
            <Link to="/destinations">Destinations</Link>
          </li>
          <li>
            <Link to="/plan">Plan a trip</Link>
          </li>
          <li>
            <a href={withBase('/images/CREDITS.md')}>Photo credits</a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
