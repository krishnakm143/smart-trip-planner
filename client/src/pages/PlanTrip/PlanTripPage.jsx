import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ErrorState from '../../components/states/ErrorState'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { listDestinations } from '../../services/destinationService'
import { createTrip } from '../../services/tripService'
import { fieldErrorsFrom } from '../../utils/fieldErrors'
import { addDays, todayInputValue } from '../../utils/formatDate'
import { pendingPlan } from '../../utils/pendingPlan'
import { validatePlanInput } from '../../utils/planValidation'
import PlanForm from './PlanForm'
import PlanPreview from './PlanPreview'
import PlanPreviewSkeleton from './PlanPreviewSkeleton'
import { usePlanPreview } from './usePlanPreview'
import styles from './PlanTripPage.module.css'

function defaultValues() {
  const startDate = addDays(todayInputValue(), 14)
  return {
    destinationId: null,
    startDate,
    endDate: addDays(startDate, 3),
    travelers: 2,
    budgetTier: 'standard',
    interests: [],
    pace: 'balanced',
  }
}

const sameInput = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export default function PlanTripPage() {
  useDocumentTitle('Plan a trip')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { notify } = useToast()

  const [restoredInput] = useState(() => pendingPlan.read())
  const [values, setValues] = useState(() => restoredInput ?? defaultValues())
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const previewRef = useRef(null)
  const { preview, generate } = usePlanPreview(restoredInput)

  useEffect(() => {
    if (preview.plan) previewRef.current?.scrollIntoView({ block: 'start' })
  }, [preview.plan])

  const loadDestinations = useCallback(
    (signal) => listDestinations({ limit: 50 }, signal).then((data) => data.items),
    [],
  )
  const destinations = useResource(loadDestinations)

  const prefillSlug = searchParams.get('destination')
  const prefillId = destinations.data?.find((item) => item.slug === prefillSlug)?.id ?? ''
  const planInput = { ...values, destinationId: values.destinationId ?? prefillId }
  const selectedDestination = destinations.data?.find((item) => item.id === planInput.destinationId)

  function handleChange(changes) {
    setValues((current) => ({ ...current, ...changes }))
    setFieldErrors((current) => {
      const next = { ...current }
      Object.keys(changes).forEach((field) => delete next[field])
      return next
    })
  }

  async function handleGenerate() {
    const errors = validatePlanInput(planInput)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await generate(planInput)
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR') setFieldErrors(fieldErrorsFrom(error))
    }
  }

  async function handleSave() {
    if (!user) {
      pendingPlan.save(preview.input)
      navigate('/login', { state: { from: { pathname: '/plan' }, reason: 'save-plan' } })
      return
    }

    setSaving(true)
    try {
      const trip = await createTrip(preview.input)
      notify('Trip saved to My trips')
      navigate(`/trips/${trip.id}`)
    } catch (error) {
      notify(error.message, 'error')
      setSaving(false)
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Plan a trip</h1>
        <p className={styles.lede}>
          Answer a few questions to get a day-wise itinerary and a cost estimate. Nothing is saved until you
          choose to save it.
        </p>
      </header>

      {destinations.error ? (
        <ErrorState title="The destination list did not load" error={destinations.error} onRetry={destinations.retry} />
      ) : (
        <PlanForm
          values={planInput}
          errors={fieldErrors}
          destinations={destinations.data}
          selectedDestination={selectedDestination}
          busy={preview.status === 'loading'}
          onChange={handleChange}
          onSubmit={handleGenerate}
        />
      )}

      <div ref={previewRef} className={styles.preview}>
        {preview.status === 'loading' && <PlanPreviewSkeleton />}
        {preview.status === 'error' && preview.error.code !== 'VALIDATION_ERROR' && (
          <ErrorState title="The plan could not be generated" error={preview.error} onRetry={() => generate(preview.input).catch(() => {})} />
        )}
        {preview.status === 'ready' && (
          <PlanPreview
            plan={preview.plan}
            input={preview.input}
            stale={!sameInput(preview.input, planInput)}
            restored={Boolean(restoredInput) && sameInput(preview.input, restoredInput)}
            signedIn={Boolean(user)}
            saving={saving}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}
