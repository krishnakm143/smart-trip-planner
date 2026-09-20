import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Reads where the visitor was headed before auth and sends them back there afterwards. */
export function useAuthRedirect() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const from = state?.from
  const destination = from ? `${from.pathname}${from.search ?? ''}` : '/trips'

  const goBack = useCallback(() => navigate(destination, { replace: true }), [navigate, destination])

  return { goBack, linkState: state, reason: state?.reason, sessionExpired: Boolean(state?.sessionExpired) }
}
