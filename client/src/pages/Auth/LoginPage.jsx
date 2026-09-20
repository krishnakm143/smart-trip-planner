import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fieldErrorsFrom } from '../../utils/fieldErrors'
import AuthLayout from './AuthLayout'
import { validateLogin } from './authValidation'
import { useAuthRedirect } from './useAuthRedirect'
import styles from './AuthForm.module.css'

const DEMO_ACCOUNT = { email: 'demo@smarttrip.in', password: 'Demo@1234' }

function noticeFor({ reason, sessionExpired }) {
  if (sessionExpired) return 'Your session has ended. Log in again to continue.'
  if (reason === 'save-plan') return 'Log in to save your plan. It will be waiting for you on the planner.'
  return null
}

export default function LoginPage() {
  useDocumentTitle('Log in')
  const { user, login } = useAuth()
  const redirect = useAuthRedirect()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) return <Navigate to="/trips" replace />

  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
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
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}
        <Field label="Email" error={errors.email}>
          {(control) => (
            <input {...control} type="email" autoComplete="email" value={values.email} onChange={setField('email')} />
          )}
        </Field>
        <Field label="Password" error={errors.password}>
          {(control) => (
            <input
              {...control}
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={setField('password')}
            />
          )}
        </Field>
        <Button type="submit" size="lg" busy={submitting} className={styles.submit}>
          {submitting ? 'Logging in' : 'Log in'}
        </Button>
      </form>

      <p className={styles.demo}>
        Demo account: <code>{DEMO_ACCOUNT.email}</code> with password <code>{DEMO_ACCOUNT.password}</code>
        <button type="button" className={styles.demoButton} onClick={() => setValues(DEMO_ACCOUNT)}>
          Fill it in
        </button>
      </p>
    </AuthLayout>
  )
}
