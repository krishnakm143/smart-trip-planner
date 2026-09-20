import { PACES } from '../../utils/constants'
import styles from './PaceSelector.module.css'

export default function PaceSelector({ value, error, onChange }) {
  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">Pace</legend>
      <div className={styles.options}>
        {PACES.map((pace) => (
          <label key={pace.value} className={styles.option}>
            <input
              type="radio"
              name="pace"
              className="visually-hidden"
              value={pace.value}
              checked={value === pace.value}
              onChange={() => onChange(pace.value)}
            />
            <span className={styles.label}>{pace.label}</span>
            <span className={styles.hours}>about {pace.hours} hours a day</span>
          </label>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
