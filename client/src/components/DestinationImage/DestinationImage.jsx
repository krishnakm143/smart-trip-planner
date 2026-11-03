import { useState } from 'react'
import { withBase } from '../../utils/basePath'
import styles from './DestinationImage.module.css'

const CATEGORY_FALLBACKS = {
  'hill-station': 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=1200&q=80',
  beach: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
  heritage: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
  spiritual: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  nature: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
  desert: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  adventure: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=1200&q=80',
}

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80'

/** Destination photo with resilient multi-tier fallback (local asset -> curated CDN photo -> text badge). */
export default function DestinationImage({
  src,
  name,
  category = '',
  alt = '',
  eager = false,
  className = '',
}) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [useFallback, setUseFallback] = useState(false)
  const [allFailed, setAllFailed] = useState(false)

  if (src && currentSrc !== src && !useFallback && !allFailed) {
    setCurrentSrc(src)
  }

  function handleError() {
    if (!useFallback) {
      setUseFallback(true)
      const fallback = CATEGORY_FALLBACKS[category] || DEFAULT_FALLBACK
      setCurrentSrc(fallback)
    } else {
      setAllFailed(true)
    }
  }

  if (!currentSrc || allFailed) {
    return (
      <div className={`${styles.fallback} ${className}`} role="img" aria-label={`${name}, photo unavailable`}>
        <span>{name}</span>
      </div>
    )
  }

  return (
    <img
      className={`${styles.photo} ${className}`}
      src={withBase(currentSrc)}
      alt={alt || name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
    />
  )
}
