import { useState } from 'react'
import styles from './DestinationImage.module.css'

/** Destination photo that degrades to a tinted name panel when the file is missing. */
export default function DestinationImage({ src, name, alt = '', eager = false, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (!src || failedSrc === src) {
    return (
      <div className={`${styles.fallback} ${className}`} role="img" aria-label={`${name}, photo unavailable`}>
        <span>{name}</span>
      </div>
    )
  }

  return (
    <img
      className={`${styles.photo} ${className}`}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  )
}
