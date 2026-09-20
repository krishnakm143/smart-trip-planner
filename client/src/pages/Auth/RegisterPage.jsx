import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { fieldErrorsFrom } from '../../utils/fieldErrors'
import AuthLayout from './AuthLayout'
import { validateRegistration } from './authValidation'
import { useAuthRedirect } from './useAuthRedirect'
import styles from './AuthForm.module.css'

export default function RegisterPage() {
  useDocumentTitle('Create account')
  const { user, register } = useAuth()
  const redirect = useAuthRedirect()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && !submitting) return <Navigate to="/trips" replace />

  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    const clientErrors = validateRegistration(values)
    setErrors(clientErrors)
    setFormError('')
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      redirect.goBack()
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') setErrors(fieldErrorsFrom(error))
      else if (error.code === 'CONFLICT') setErrors({ email: 'An account with this email already exists. Log in instead.' })
      else setFormError(error.message)
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
            <input {...control} type="email" autoComplete="email" value={values.email} onChange={setField('email')} />
          )}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          {(control) => (
            <input
              {...control}
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={setField('password')}
            />
          )}
        </Field>
        <Button type="submit" size="lg" busy={submitting} className={styles.submit}>
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
