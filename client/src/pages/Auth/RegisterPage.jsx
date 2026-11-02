import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fieldErrorsFrom } from '../../utils/fieldErrors'
import AuthLayout from './AuthLayout'
import { validateRegistration } from './authValidation'
import { validateEmailSecurity } from '@server/utils/emailValidator.js'
import { useAuthRedirect } from './useAuthRedirect'
import styles from './AuthForm.module.css'

export default function RegisterPage() {
  useDocumentTitle('Create account')
  const { user, register } = useAuth()
  const redirect = useAuthRedirect()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (user && !submitting) return <Navigate to="/trips" replace />

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

  async function handleSubmit(event) {
    event.preventDefault()
    const clientErrors = validateRegistration(values)
    setErrors(clientErrors)
    setFormError('')
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      const result = await register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      if (result.emailConfirmationRequired) {
        setConfirmationSent(true)
        setSubmitting(false)
        return
      }
      redirect.goBack()
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') {
        setErrors(fieldErrorsFrom(error))
      } else if (error.code === 'CONFLICT' || error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already exists')) {
        setErrors({ email: 'An account with this email already exists. Log in instead.' })
      } else {
        setFormError(error.message || 'Could not create account. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      intro="An account keeps your trips in one place so you can come back to them."
      notice={redirect.reason === 'save-plan' ? 'Create an account to save your plan. It will be waiting for you on the planner.' : null}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={redirect.linkState} className="text-link">
            Log in
          </Link>
        </>
      }
    >
      {confirmationSent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px' }} role="status">
          <div>
            <h3 style={{ margin: '0 0 0.25rem', color: '#047857', fontSize: '1.05rem', fontWeight: 600 }}>Account confirmation sent!</h3>
            <p style={{ margin: 0, color: '#065f46', fontSize: '0.9rem' }}>
              We sent a verification link to <strong>{values.email}</strong>. Please check your inbox or spam folder to confirm your email, then return here to log in.
            </p>
          </div>
          <Link to="/login" state={redirect.linkState} className="text-link" style={{ fontWeight: 600, color: '#047857' }}>
            Go to Log in &rarr;
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          <Field label="Full name" error={errors.name}>
            {(control) => <input {...control} type="text" autoComplete="name" value={values.name} onChange={setField('name')} />}
          </Field>
          <Field label="Email" error={errors.email}>
            {(control) => (
              <input {...control} type="email" autoComplete="email" value={values.email} onChange={setField('email')} onBlur={handleBlur('email')} />
            )}
          </Field>
          <Field label="Password" error={errors.password} hint="At least 8 characters.">
            {(control) => (
              <div className={styles.passwordWrapper}>
                <input
                  {...control}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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
            {submitting ? 'Creating account' : 'Create account'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
