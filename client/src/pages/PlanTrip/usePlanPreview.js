import { useCallback, useEffect, useRef, useState } from 'react'
import { previewPlan } from '../../services/plannerService'
import { pendingPlan } from '../../utils/pendingPlan'

/**
 * Holds the generated plan together with the exact PlanInput that produced it.
 * `restoredInput` is a plan parked in sessionStorage before a login detour; it
 * is regenerated once on mount so the visitor lands back on their preview.
 */
export function usePlanPreview(restoredInput) {
  const [preview, setPreview] = useState({
    status: restoredInput ? 'loading' : 'idle',
    input: restoredInput,
    plan: null,
    error: null,
  })
  const requestRef = useRef(null)

  const run = useCallback((input) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    return previewPlan(input, controller.signal)
      .then((plan) => {
        setPreview({ status: 'ready', input, plan, error: null })
        return plan
      })
      .catch((error) => {
        if (controller.signal.aborted) return null
        setPreview({ status: 'error', input, plan: null, error })
        throw error
      })
  }, [])

  const generate = useCallback(
    (input) => {
      setPreview({ status: 'loading', input, plan: null, error: null })
      return run(input)
    },
    [run],
  )

  useEffect(() => {
    if (!restoredInput) return undefined
    run(restoredInput)
      .then((plan) => plan && pendingPlan.clear())
      .catch(() => {})
    return () => requestRef.current?.abort()
  }, [restoredInput, run])

  return { preview, generate }
}
