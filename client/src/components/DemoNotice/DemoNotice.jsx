import styles from './DemoNotice.module.css'

/** Shown only in the static GitHub Pages build, where data stays in the browser. */
export default function DemoNotice() {
  return (
    <aside className={styles.notice} aria-label="About this demo build">
      <p className="container">
        <strong>Demo build.</strong> Accounts and trips are saved in this browser only. The full
        application runs on a Node.js and Express API with MongoDB.
      </p>
    </aside>
  )
}
