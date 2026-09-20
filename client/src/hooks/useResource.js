import { useCallback, useEffect, useState } from 'react'

const EMPTY = { load: null, attempt: -1, data: null, error: null }

/**
 * Runs `load(signal)` whenever its identity changes (memoise it with
 * useCallback) and tracks the outcome. Loading is derived from whether the
 * stored result belongs to the current request, so stale responses can never
 * be shown for a newer query.
 */
export function useResource(load) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(EMPTY)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => setResult({ load, attempt, data, error: null }))
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ load, attempt, data: null, error })
      })
    return () => controller.abort()
  }, [load, attempt])

  const settled = result.load === load && result.attempt === attempt
  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  const setData = useCallback((data) => setResult((current) => ({ ...current, data })), [])

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: !settled,
    retry,
    setData,
  }
}
