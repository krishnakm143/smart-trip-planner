import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Mail, KeyRound, Eye, EyeOff, CheckCircle2, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fieldErrorsFrom } from '../../utils/fieldErrors'
import { sendOtp, sendPasswordResetOtp, resetPasswordWithOtp } from '../../services/authService'
import { supabase, sendSupabasePasswordReset, updateSupabasePassword } from '../../services/supabaseClient'
import AuthLayout from './AuthLayout'
import { validateLogin } from './authValidation'
import { validateEmailSecurity } from '@server/utils/emailValidator.js'
import { useAuthRedirect } from './useAuthRedirect'
import styles from './AuthForm.module.css'

const DEMO_ACCOUNT = { email: 'demo@smarttrip.in', password: 'Demo@1234' }

function isRecoveryUrl() {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  return hash.includes('type=recovery') || search.includes('mode=recovery')
}

function noticeFor({ reason, sessionExpired }) {
  if (sessionExpired) return 'Your session has ended. Log in again to continue.'
  if (reason === 'save-plan') return 'Log in to save your plan. It will be waiting for you on the planner.'
  return null
}

export default function LoginPage() {
  useDocumentTitle('Log in')
  const location = useLocation()
  const { user, login, loginWithOtp, usesSupabaseAuth } = useAuth()
  const redirect = useAuthRedirect()
  const [authMode, setAuthMode] = useState('password') // 'password' | 'otp'
  const [values, setValues] = useState({ email: '', password: '', code: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [formSuccessMsg, setFormSuccessMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [resending, setResending] = useState(false)

  // Forgot password modal state
  const isRecoveryInLocation = Boolean(
    isRecoveryUrl() ||
    location.hash?.includes('type=recovery') ||
    location.search?.includes('mode=recovery'),
  )
  const [recoveryMode, setRecoveryMode] = useState(isRecoveryInLocation)
  const [showForgotModal, setShowForgotModal] = useState(isRecoveryInLocation)
  const [forgotMethod, setForgotMethod] = useState(() => (isRecoveryInLocation ? 'recovery' : 'otp'))
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotCode, setForgotCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotErrors, setForgotErrors] = useState({})
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('')
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [forgotOtpSent, setForgotOtpSent] = useState(false)
  const [forgotCountdown, setForgotCountdown] = useState(30)
  const [forgotResending, setForgotResending] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const closeForgotModal = useCallback(() => {
    if (forgotSubmitting) return
    setShowForgotModal(false)
    setForgotErrors({})
    setForgotError('')
    setForgotSuccessMsg('')
    setForgotOtpSent(false)
    setRecoveryMode(false)
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const search = window.location.search.replace(/([?&])mode=recovery(&|$)/, '$1').replace(/[?&]$/, '')
      const cleanUrl = window.location.pathname + (search ? `?${search}` : '')
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [forgotSubmitting])

  const openForgotModal = useCallback(() => {
    setForgotEmail(values.email.trim())
    setForgotCode('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotErrors({})
    setForgotError('')
    setForgotSuccessMsg('')
    setForgotOtpSent(false)
    setForgotMethod('otp')
    setShowForgotModal(true)
  }, [values.email])


  // Listen to Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    if (!supabase) return undefined
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setShowForgotModal(true)
        setForgotMethod('recovery')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ESC key listener to close modal
  useEffect(() => {
    if (!showForgotModal) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !forgotSubmitting) {
        closeForgotModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showForgotModal, forgotSubmitting, closeForgotModal])

  useEffect(() => {
    if (!otpSent || countdown <= 0) return undefined
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpSent, countdown])

  useEffect(() => {
    if (!forgotOtpSent || forgotCountdown <= 0) return undefined
    const timer = setInterval(() => {
      setForgotCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [forgotOtpSent, forgotCountdown])

  if (user && !submitting && !recoveryMode && !showForgotModal) return <Navigate to="/trips" replace />

  const setField = (field) => (event) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [field]: value }))

    // Clear field-specific error as user types
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleBlur = (field) => () => {
    if (field === 'email' && values.email.trim()) {
      const result = validateEmailSecurity(values.email.trim())
      if (!result.valid) {
        setErrors((prev) => ({ ...prev, email: result.message }))
      }
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    const clientErrors = validateLogin(values)
    setErrors(clientErrors)
    setFormError('')
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      await login({ email: values.email.trim(), password: values.password })
      redirect.goBack()
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') setErrors(fieldErrorsFrom(error))
      else setFormError(error.message)
      setSubmitting(false)
    }
  }

  async function handleSendOtp(event) {
    event?.preventDefault()
    setFormError('')
    const trimmedEmail = values.email.trim()
    if (!trimmedEmail) {
      setErrors({ email: 'Enter your email address first.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await sendOtp(trimmedEmail)
      setOtpSent(true)
      setCountdown(30)
      if (res?.debugCode) {
        setOtpSuccessMsg(`${res.message || 'Verification code sent.'} (Code: ${res.debugCode})`)
        setValues((v) => ({ ...v, code: res.debugCode }))
      } else {
        setOtpSuccessMsg(res?.message || 'Verification code sent to your email.')
        setValues((v) => ({ ...v, code: '' }))
      }
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') setErrors(fieldErrorsFrom(error))
      else setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendOtp() {
    if (countdown > 0 || resending) return
    setResending(true)
    setFormError('')
    try {
      const res = await sendOtp(values.email.trim())
      setCountdown(30)
      if (res?.debugCode) {
        setOtpSuccessMsg(`${res.message || 'New verification code sent.'} (Code: ${res.debugCode})`)
        setValues((v) => ({ ...v, code: res.debugCode }))
      } else {
        setOtpSuccessMsg(res?.message || 'New verification code sent.')
        setValues((v) => ({ ...v, code: '' }))
      }
    } catch (error) {
      setFormError(error.message || 'Could not resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  async function handleOtpVerify(event) {
    event.preventDefault()
    setFormError('')
    if (!values.code || values.code.trim().length !== 6) {
      setErrors({ code: 'Enter the 6-digit verification code.' })
      return
    }

    setSubmitting(true)
    try {
      await loginWithOtp({ email: values.email.trim(), code: values.code.trim() })
      redirect.goBack()
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') setErrors(fieldErrorsFrom(error))
      else setFormError(error.message)
      setSubmitting(false)
    }
  }


  async function handleSendForgotOtp(event) {
    event?.preventDefault()
    setForgotError('')
    setForgotSuccessMsg('')
    const trimmed = forgotEmail.trim()
    if (!trimmed) {
      setForgotErrors({ email: 'Enter your email address first.' })
      return
    }
    const emailSec = validateEmailSecurity(trimmed)
    if (!emailSec.valid) {
      setForgotErrors({ email: emailSec.message })
      return
    }

    setForgotSubmitting(true)
    try {
      const res = await sendPasswordResetOtp(trimmed)
      setForgotOtpSent(true)
      setForgotCountdown(30)
      if (res?.debugCode) {
        setForgotSuccessMsg(`${res.message || 'Verification code sent.'} (Code: ${res.debugCode})`)
        setForgotCode(res.debugCode)
      } else {
        setForgotSuccessMsg(res?.message || 'Verification code sent to your email.')
        setForgotCode('')
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') setForgotErrors(fieldErrorsFrom(err))
      else setForgotError(err.message || 'Failed to send verification code.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  async function handleResendForgotOtp() {
    if (forgotCountdown > 0 || forgotResending) return
    setForgotResending(true)
    setForgotError('')
    try {
      const res = await sendPasswordResetOtp(forgotEmail.trim())
      setForgotCountdown(30)
      if (res?.debugCode) {
        setForgotSuccessMsg(`${res.message || 'New verification code sent.'} (Code: ${res.debugCode})`)
        setForgotCode(res.debugCode)
      } else {
        setForgotSuccessMsg(res?.message || 'New verification code sent.')
        setForgotCode('')
      }
    } catch (err) {
      setForgotError(err.message || 'Could not resend code. Please try again.')
    } finally {
      setForgotResending(false)
    }
  }

  async function handleResetWithOtp(event) {
    event.preventDefault()
    setForgotError('')
    setForgotSuccessMsg('')
    const errorsMap = {}

    if (!forgotCode || !/^\d{6}$/.test(forgotCode.trim())) {
      errorsMap.code = 'Enter the 6-digit verification code.'
    }
    if (!newPassword || newPassword.trim().length < 8) {
      errorsMap.newPassword = 'Password must be at least 8 characters and not only whitespace.'
    } else if (newPassword.length > 72) {
      errorsMap.newPassword = 'Password cannot exceed 72 characters.'
    }
    if (newPassword !== confirmPassword) {
      errorsMap.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errorsMap).length > 0) {
      setForgotErrors(errorsMap)
      return
    }

    setForgotSubmitting(true)
    try {
      const res = await resetPasswordWithOtp({
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword,
      })
      setValues((v) => ({ ...v, email: forgotEmail.trim(), password: newPassword }))
      setAuthMode('password')
      setErrors({})
      setFormError('')
      setFormSuccessMsg(res.message || 'Password reset successfully! You can now log in.')
      closeForgotModal()
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') setForgotErrors(fieldErrorsFrom(err))
      else setForgotError(err.message || 'Could not reset password. Please check the code and try again.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  async function handleSendSupabaseLink(event) {
    event.preventDefault()
    setForgotError('')
    setForgotSuccessMsg('')
    const trimmed = forgotEmail.trim()
    if (!trimmed) {
      setForgotErrors({ email: 'Enter your email address first.' })
      return
    }
    const emailSec = validateEmailSecurity(trimmed)
    if (!emailSec.valid) {
      setForgotErrors({ email: emailSec.message })
      return
    }

    setForgotSubmitting(true)
    try {
      await sendSupabasePasswordReset(trimmed)
      setForgotSuccessMsg('Password reset link sent! Check your email inbox to proceed.')
    } catch (err) {
      setForgotError(err.message || 'Failed to send password reset email via Supabase.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  async function handleSupabaseUpdatePassword(event) {
    event.preventDefault()
    setForgotError('')
    setForgotSuccessMsg('')
    const errorsMap = {}
    if (!newPassword || newPassword.trim().length < 8) {
      errorsMap.newPassword = 'Password must be at least 8 characters and not only whitespace.'
    } else if (newPassword.length > 72) {
      errorsMap.newPassword = 'Password cannot exceed 72 characters.'
    }
    if (newPassword !== confirmPassword) {
      errorsMap.confirmPassword = 'Passwords do not match.'
    }
    if (Object.keys(errorsMap).length > 0) {
      setForgotErrors(errorsMap)
      return
    }

    setForgotSubmitting(true)
    try {
      await updateSupabasePassword(newPassword)
      setFormSuccessMsg('Password updated successfully! Welcome back.')
      closeForgotModal()
      redirect.goBack()
    } catch (err) {
      setForgotError(err.message || 'Failed to update password. Your recovery link may have expired.')
    } finally {
      setForgotSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Log in"
      intro="Log in to see your saved trips, notes and budgets."
      notice={noticeFor(redirect)}
      footer={
        <>
          New here?{' '}
          <Link to="/register" state={redirect.linkState} className="text-link">
            Create an account
          </Link>
        </>
      }
    >
      {/* Auth Mode Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => {
            setAuthMode('password')
            setErrors({})
            setFormError('')
          }}
          style={{
            padding: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '4px',
            border: '1px solid',
            borderColor: authMode === 'password' ? 'var(--accent, #0284c7)' : 'var(--line, #cbd5e1)',
            background: authMode === 'password' ? '#f0f9ff' : '#ffffff',
            color: authMode === 'password' ? 'var(--accent, #0284c7)' : 'var(--ink-soft, #475569)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <KeyRound size={15} /> Password
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('otp')
            setErrors({})
            setFormError('')
          }}
          style={{
            padding: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '4px',
            border: '1px solid',
            borderColor: authMode === 'otp' ? 'var(--accent, #0284c7)' : 'var(--line, #cbd5e1)',
            background: authMode === 'otp' ? '#f0f9ff' : '#ffffff',
            color: authMode === 'otp' ? 'var(--accent, #0284c7)' : 'var(--ink-soft, #475569)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Mail size={15} /> Email OTP
        </button>
      </div>

      {authMode === 'password' ? (
        <form className={styles.form} onSubmit={handlePasswordSubmit} noValidate>
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          {formSuccessMsg && (
            <div className={styles.successBanner} role="status">
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{formSuccessMsg}</span>
            </div>
          )}
          <Field label="Email" error={errors.email}>
            {(control) => (
              <input {...control} type="email" autoComplete="email" value={values.email} onChange={setField('email')} onBlur={handleBlur('email')} />
            )}
          </Field>
          <Field
            label="Password"
            action={
              <button
                type="button"
                className={styles.forgotLink}
                onClick={openForgotModal}
              >
                Forgot password?
              </button>
            }
            error={errors.password}
          >
            {(control) => (
              <div className={styles.passwordWrapper}>
                <input
                  {...control}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={values.password}
                  onChange={setField('password')}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </Field>
          <Button type="submit" size="lg" busy={submitting} className={styles.submit}>
            {submitting ? 'Logging in' : 'Log in'}
          </Button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={otpSent ? handleOtpVerify : handleSendOtp} noValidate>
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          {otpSuccessMsg && (
            <p style={{ margin: '0 0 1rem', padding: '0.6rem 0.75rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '4px', color: '#047857', fontSize: '0.85rem' }} role="status">
              {otpSuccessMsg}
            </p>
          )}
          <Field label="Email" error={errors.email}>
            {(control) => (
              <input
                {...control}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={values.email}
                onChange={setField('email')}
                onBlur={handleBlur('email')}
                disabled={otpSent}
              />
            )}
          </Field>

          {otpSent && (
            <>
              <Field label="6-Digit Verification Code" error={errors.code} hint="Check your inbox or spam folder for the login code.">
                {(control) => (
                  <input
                    {...control}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={values.code}
                    onChange={setField('code')}
                    style={{ letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}
                  />
                )}
              </Field>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  margin: '-0.4rem 0 1rem',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--ink-soft, #64748b)' }}>
                  {countdown > 0 ? (
                    <>
                      ⏱️ Resend code in <strong>{countdown}s</strong>
                    </>
                  ) : (
                    'Didn’t get the email?'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.2rem 0.4rem',
                    color: countdown > 0 || resending ? '#94a3b8' : 'var(--accent, #0284c7)',
                    fontWeight: 600,
                    cursor: countdown > 0 || resending ? 'not-allowed' : 'pointer',
                    textDecoration: countdown > 0 ? 'none' : 'underline',
                  }}
                >
                  {resending ? 'Sending…' : 'Resend Code'}
                </button>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {otpSent ? (
              <>
                <Button type="submit" size="lg" busy={submitting} className={styles.submit}>
                  {submitting ? 'Verifying…' : 'Verify & Log in'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setOtpSent(false)
                    setOtpSuccessMsg('')
                    setValues((v) => ({ ...v, code: '' }))
                  }}
                >
                  Change Email
                </Button>
              </>
            ) : (
              <Button type="submit" size="lg" busy={submitting} className={styles.submit}>
                {submitting ? 'Sending code…' : 'Send verification code'}
              </Button>
            )}
          </div>
        </form>
      )}

      {authMode === 'password' && (
        <p className={styles.demo}>
          Demo account: <code>{DEMO_ACCOUNT.email}</code> with password <code>{DEMO_ACCOUNT.password}</code>
          <button
            type="button"
            className={styles.demoButton}
            onClick={() => {
              setValues(DEMO_ACCOUNT)
              setErrors({})
              setFormError('')
            }}
          >
            Fill it in
          </button>
        </p>
      )}

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForgotModal()
          }}
        >
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 id="forgot-modal-title" className={styles.modalTitle}>
                {recoveryMode ? 'Set New Password' : 'Reset Password'}
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Close dialog"
                onClick={closeForgotModal}
              >
                <X size={18} />
              </button>
            </div>

            <p className={styles.modalSub}>
              {recoveryMode
                ? 'Enter your new account password below to finish recovery.'
                : 'Recover your account using a 6-digit verification code or email reset link.'}
            </p>

            {forgotError && (
              <p className={styles.formError} role="alert" style={{ marginBottom: '1rem' }}>
                {forgotError}
              </p>
            )}

            {forgotSuccessMsg && (
              <div className={styles.successBanner} role="status">
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            {/* If Supabase Auth is enabled and not in recovery mode, allow method selection */}
            {!recoveryMode && usesSupabaseAuth && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod('otp')
                    setForgotError('')
                    setForgotSuccessMsg('')
                  }}
                  style={{
                    padding: '0.45rem',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: forgotMethod === 'otp' ? 'var(--accent, #0e5e5a)' : 'var(--line, #cbd5e1)',
                    background: forgotMethod === 'otp' ? 'var(--accent-tint, #dbe8e2)' : '#ffffff',
                    color: forgotMethod === 'otp' ? 'var(--accent, #0e5e5a)' : 'var(--ink-soft, #475569)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <KeyRound size={14} /> Brevo OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMethod('supabase')
                    setForgotError('')
                    setForgotSuccessMsg('')
                  }}
                  style={{
                    padding: '0.45rem',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: forgotMethod === 'supabase' ? 'var(--accent, #0e5e5a)' : 'var(--line, #cbd5e1)',
                    background: forgotMethod === 'supabase' ? 'var(--accent-tint, #dbe8e2)' : '#ffffff',
                    color: forgotMethod === 'supabase' ? 'var(--accent, #0e5e5a)' : 'var(--ink-soft, #475569)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Mail size={14} /> Supabase Link
                </button>
              </div>
            )}

            {/* FLOW 1: RECOVERY MODE (When arriving from Supabase reset link) */}
            {recoveryMode ? (
              <form onSubmit={handleSupabaseUpdatePassword} noValidate style={{ display: 'grid', gap: '0.85rem' }}>
                <Field label="New Password" error={forgotErrors.newPassword}>
                  {(control) => (
                    <div className={styles.passwordWrapper}>
                      <input
                        {...control}
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          if (forgotErrors.newPassword) setForgotErrors((prev) => ({ ...prev, newPassword: '' }))
                        }}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowNewPassword((v) => !v)}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </Field>
                <Field label="Confirm New Password" error={forgotErrors.confirmPassword}>
                  {(control) => (
                    <div className={styles.passwordWrapper}>
                      <input
                        {...control}
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (forgotErrors.confirmPassword) setForgotErrors((prev) => ({ ...prev, confirmPassword: '' }))
                        }}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}
                </Field>
                <Button type="submit" size="lg" busy={forgotSubmitting} className={styles.submit}>
                  {forgotSubmitting ? 'Saving…' : 'Set New Password'}
                </Button>
              </form>
            ) : forgotMethod === 'supabase' ? (
              /* FLOW 2: SUPABASE RESET LINK */
              <form onSubmit={handleSendSupabaseLink} noValidate style={{ display: 'grid', gap: '0.85rem' }}>
                <Field label="Account Email" error={forgotErrors.email}>
                  {(control) => (
                    <input
                      {...control}
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value)
                        if (forgotErrors.email) setForgotErrors((prev) => ({ ...prev, email: '' }))
                      }}
                    />
                  )}
                </Field>
                <Button type="submit" size="lg" busy={forgotSubmitting} className={styles.submit}>
                  {forgotSubmitting ? 'Sending link…' : 'Send Reset Link'}
                </Button>
              </form>
            ) : (
              /* FLOW 3: BREVO OTP RESET */
              <form
                onSubmit={forgotOtpSent ? handleResetWithOtp : handleSendForgotOtp}
                noValidate
                style={{ display: 'grid', gap: '0.85rem' }}
              >
                <Field label="Account Email" error={forgotErrors.email}>
                  {(control) => (
                    <input
                      {...control}
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value)
                        if (forgotErrors.email) setForgotErrors((prev) => ({ ...prev, email: '' }))
                      }}
                      disabled={forgotOtpSent}
                    />
                  )}
                </Field>

                {forgotOtpSent && (
                  <>
                    <Field
                      label="6-Digit Verification Code"
                      error={forgotErrors.code}
                      hint="Check your email for the verification code sent via Brevo."
                    >
                      {(control) => (
                        <input
                          {...control}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={forgotCode}
                          onChange={(e) => {
                            setForgotCode(e.target.value)
                            if (forgotErrors.code) setForgotErrors((prev) => ({ ...prev, code: '' }))
                          }}
                          style={{ letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}
                        />
                      )}
                    </Field>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        margin: '-0.3rem 0 0.2rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <span style={{ color: 'var(--ink-soft, #64748b)' }}>
                        {forgotCountdown > 0 ? (
                          <>⏱️ Resend code in <strong>{forgotCountdown}s</strong></>
                        ) : (
                          'Didn’t receive code?'
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={handleResendForgotOtp}
                        disabled={forgotCountdown > 0 || forgotResending}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.2rem',
                          color: forgotCountdown > 0 || forgotResending ? '#94a3b8' : 'var(--accent, #0e5e5a)',
                          fontWeight: 600,
                          cursor: forgotCountdown > 0 || forgotResending ? 'not-allowed' : 'pointer',
                          textDecoration: forgotCountdown > 0 ? 'none' : 'underline',
                        }}
                      >
                        {forgotResending ? 'Sending…' : 'Resend Code'}
                      </button>
                    </div>

                    <Field label="New Password" error={forgotErrors.newPassword}>
                      {(control) => (
                        <div className={styles.passwordWrapper}>
                          <input
                            {...control}
                            type={showNewPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value)
                              if (forgotErrors.newPassword) setForgotErrors((prev) => ({ ...prev, newPassword: '' }))
                            }}
                          />
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowNewPassword((v) => !v)}
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      )}
                    </Field>

                    <Field label="Confirm New Password" error={forgotErrors.confirmPassword}>
                      {(control) => (
                        <div className={styles.passwordWrapper}>
                          <input
                            {...control}
                            type={showConfirmPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value)
                              if (forgotErrors.confirmPassword) setForgotErrors((prev) => ({ ...prev, confirmPassword: '' }))
                            }}
                          />
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowConfirmPassword((v) => !v)}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      )}
                    </Field>
                  </>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {forgotOtpSent ? (
                    <>
                      <Button type="submit" size="lg" busy={forgotSubmitting} className={styles.submit}>
                        {forgotSubmitting ? 'Resetting…' : 'Reset Password'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        onClick={() => {
                          setForgotOtpSent(false)
                          setForgotCountdown(0)
                          setForgotSuccessMsg('')
                          setForgotCode('')
                        }}
                      >
                        Change Email
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" size="lg" busy={forgotSubmitting} className={styles.submit}>
                      {forgotSubmitting ? 'Sending code…' : 'Send verification code'}
                    </Button>
                  )}
                </div>
              </form>
            )}

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
              <button
                type="button"
                className={styles.forgotLink}
                onClick={closeForgotModal}
                style={{ fontSize: '0.875rem' }}
              >
                ← Return to Log in
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
