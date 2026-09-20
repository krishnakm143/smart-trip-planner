import { Minus, Plus } from 'lucide-react'
import styles from './Stepper.module.css'

export default function Stepper({ id, value, min, max, onChange, unit, ...aria }) {
  const clamp = (next) => Math.min(max, Math.max(min, next))

  function handleInput(event) {
    const next = Number.parseInt(event.target.value, 10)
    if (!Number.isNaN(next)) onChange(clamp(next))
  }

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Remove one ${unit}`}
      >
        <Minus aria-hidden="true" />
      </button>
      <input
        id={id}
        className={styles.value}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={handleInput}
        {...aria}
      />
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Add one ${unit}`}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  )
}
