import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onUnauthorized, tokenStore } from '../services/apiClient'
import * as authService from '../services/authService'
import { stripBase } from '../utils/basePath'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(() => Boolean(tokenStore.get()))
  const restoringRef = useRef(restoring)

  useEffect(() => {
    onUnauthorized(() => {
      setUser(null)
      // An expired token found while restoring should not bounce a visitor off a public page.
      if (restoringRef.current) return
      navigate('/login', {
        replace: true,
        state: { from: { pathname: stripBase(window.location.pathname) }, sessionExpired: true },
      })
    })
    return () => onUnauthorized(null)
  }, [navigate])

  useEffect(() => {
    if (!tokenStore.get()) return undefined
    const controller = new AbortController()
    authService
      .fetchCurrentUser(controller.signal)
      .then(setUser)
      .catch(() => {})
      .finally(() => {
        if (controller.signal.aborted) return
        restoringRef.current = false
        setRestoring(false)
      })
    return () => controller.abort()
  }, [])

  const startSession = useCallback(({ user: nextUser, token }) => {
    tokenStore.set(token)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    (credentials) => authService.login(credentials).then(startSession),
    [startSession],
  )

  const register = useCallback(
    (credentials) => authService.register(credentials).then(startSession),
    [startSession],
  )

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, restoring, login, register, logout }),
    [user, restoring, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
