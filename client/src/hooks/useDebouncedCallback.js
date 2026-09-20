import { useCallback, useEffect, useRef } from 'react'

/** Returns `[run, cancel]`. `run` delays the latest `callback` until calls stop for `delayMs`. */
export function useDebouncedCallback(callback, delayMs = 350) {
  const timer = useRef(null)
  const latest = useRef(callback)

  useEffect(() => {
    latest.current = callback
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  const cancel = useCallback(() => clearTimeout(timer.current), [])

  const run = useCallback(
    (...args) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => latest.current(...args), delayMs)
    },
    [delayMs],
  )

  return [run, cancel]
}
