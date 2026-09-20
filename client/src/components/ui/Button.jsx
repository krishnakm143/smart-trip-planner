import { Link } from 'react-router-dom'
import styles from './Button.module.css'

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  busy = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} aria-busy={busy || undefined} disabled={busy || disabled} {...rest}>
      {children}
    </button>
  )
}
