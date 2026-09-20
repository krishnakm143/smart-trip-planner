import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BudgetBreakdown from '../../components/BudgetBreakdown/BudgetBreakdown'
import Itinerary from '../../components/Itinerary/Itinerary'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import Skeleton from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { deleteTrip, getTrip, updateTrip } from '../../services/tripService'
import { labelFor } from '../../utils/constants'
import TripActions from './TripActions'
import TripEditor from './TripEditor'
import TripHero from './TripHero'
import TripSummary from './TripSummary'
import styles from './TripDetailsPage.module.css'

export default function TripDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const load = useCallback((signal) => getTrip(id, signal), [id])
  const { data: trip, error, loading, retry, setData: setTrip } = useResource(load)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const closeDialog = useCallback(() => setConfirmingDelete(false), [])
  useDocumentTitle(trip?.title ?? 'Trip')

  if (loading) {
    return (
      <div className={`container ${styles.loading}`} role="status" aria-label="Loading trip">
        <Skeleton height="18rem" />
        <Skeleton width="40%" height="2rem" />
        <Skeleton height="12rem" />
      </div>
    )
  }

  if (error) {
    const missing = error.status === 404 || error.status === 400
    return (
      <div className={`container ${styles.loading}`}>
        {missing ? (
          <EmptyState title="This trip does not exist" message="It may have been deleted, or it belongs to another account.">
            <Button to="/trips">Back to My trips</Button>
          </EmptyState>
        ) : (
          <ErrorState title="This trip did not load" error={error} onRetry={retry} />
        )}
      </div>
    )
  }

  async function saveChanges(changes, confirmation) {
    const updated = await updateTrip(trip.id, changes)
    setTrip(updated)
    notify(confirmation)
  }

  async function handleStatusChange(status) {
    try {
      await saveChanges({ status }, `Trip marked as ${labelFor(status).toLowerCase()}`)
    } catch (statusError) {
      notify(statusError.message, 'error')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTrip(trip.id)
      notify('Trip deleted')
      navigate('/trips', { replace: true })
    } catch (deleteError) {
      notify(deleteError.message, 'error')
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <article>
      <TripHero trip={trip} />

      <div className={`container ${styles.body}`}>
        <TripActions status={trip.status} onStatusChange={handleStatusChange} onDelete={() => setConfirmingDelete(true)} />
        <TripSummary trip={trip} />

        <div className={styles.columns}>
          <section aria-labelledby="itinerary-heading">
            <h2 id="itinerary-heading" className={styles.sectionHeading}>
              Itinerary
            </h2>
            <Itinerary days={trip.itinerary} layout="stacked" />
          </section>

          <div className={styles.side}>
            <section aria-labelledby="budget-heading">
              <h2 id="budget-heading" className={styles.sectionHeading}>
                Budget
              </h2>
              <BudgetBreakdown budget={trip.budget} travelers={trip.travelers} days={trip.days} />
            </section>
            <TripEditor trip={trip} onSave={(changes) => saveChanges(changes, 'Changes saved')} />
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <Dialog
          title="Delete this trip?"
          description={`"${trip.title}" and its itinerary, budget and notes will be removed for good.`}
          onClose={closeDialog}
        >
          <Button variant="ghost" onClick={closeDialog}>
            Keep trip
          </Button>
          <Button variant="danger" onClick={handleDelete} busy={deleting}>
            {deleting ? 'Deleting trip' : 'Delete trip'}
          </Button>
        </Dialog>
      )}
    </article>
  )
}
