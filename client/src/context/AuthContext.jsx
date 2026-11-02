import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onUnauthorized, tokenStore } from '../services/apiClient'
import * as authService from '../services/authService'
import { supabase, toAppUser, usesSupabaseAuth } from '../services/supabaseClient'
import { stripBase } from '../utils/basePath'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(() => usesSupabaseAuth || Boolean(tokenStore.get()))
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
    if (supabase) {
      let mounted = true
      supabase.auth
        .getUser()
        .then(async ({ data }) => {
          if (!mounted) return
          if (data?.user) {
            setUser(toAppUser(data.user))
          } else if (tokenStore.get()) {
            try {
              const u = await authService.fetchCurrentUser()
              if (mounted && u) setUser(u)
            } catch {
              // Token invalid
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!mounted) return
          restoringRef.current = false
          setRestoring(false)
        })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return
        if (session?.access_token) {
          tokenStore.set(session.access_token)
        }
        setUser(session?.user ? toAppUser(session.user) : null)
      })
      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }

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
    async (credentials) => {
      if (!supabase) return authService.login(credentials).then(startSession)
      try {
        const { data, error } = await supabase.auth.signInWithPassword(credentials)
        if (error) throw error
        if (data.session?.access_token) {
          tokenStore.set(data.session.access_token)
        }
        const nextUser = toAppUser(data.user)
        setUser(nextUser)
        return { user: nextUser }
      } catch (sbError) {
        // Fall back to server authService if Supabase password auth fails
        try {
          const res = await authService.login(credentials)
          startSession(res)
          return res
        } catch {
          throw sbError
        }
      }
    },
    [startSession],
  )

  const register = useCallback(
    async (credentials) => {
      if (!supabase) return authService.register(credentials).then(startSession)
      const { name, ...signUp } = credentials
      try {
        const { data, error } = await supabase.auth.signUp({
          ...signUp,
          options: { data: { name } },
        })
        if (error) throw error
        if (!data.session) return { emailConfirmationRequired: true }
        if (data.session?.access_token) {
          tokenStore.set(data.session.access_token)
        }
        const nextUser = toAppUser(data.user)
        setUser(nextUser)
        return { user: nextUser }
      } catch (sbError) {
        try {
          const res = await authService.register(credentials)
          startSession(res)
          return res
        } catch {
          throw sbError
        }
      }
    },
    [startSession],
  )

  const loginWithOtp = useCallback(
    async ({ email, code }) => {
      const data = await authService.verifyOtp({ email, code })
      if (supabase && data?.token && data?.refreshToken) {
        await supabase.auth
          .setSession({
            access_token: data.token,
            refresh_token: data.refreshToken,
          })
          .catch(() => {})
      }
      startSession(data)
      return data
    },
    [startSession],
  )

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, restoring, login, register, loginWithOtp, logout, usesSupabaseAuth }),
    [user, restoring, login, register, loginWithOtp, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
