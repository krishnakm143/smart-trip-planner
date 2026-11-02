import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bot,
  Calendar,
  FileCheck,
  Package,
  Settings,
  Wallet,
} from 'lucide-react'
import BudgetBreakdown from '../../components/BudgetBreakdown/BudgetBreakdown'
import Itinerary from '../../components/Itinerary/Itinerary'
import InteractiveMap from '../../components/InteractiveMap/InteractiveMap'
import WeatherWidget from '../../components/WeatherWidget/WeatherWidget'
import AIAssistant from '../../components/AIAssistant/AIAssistant'
import EmptyState from '../../components/states/EmptyState'
import ErrorState from '../../components/states/ErrorState'
import Button from '../../components/ui/Button'
import Dialog from '../../components/ui/Dialog'
import Skeleton from '../../components/ui/Skeleton'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useResource } from '../../hooks/useResource'
import { deleteTrip, duplicateTrip, emailTripPlan, getTrip, updateTrip } from '../../services/tripService'
import { exportTripToIcs } from '../../utils/calendarExport'
import { labelFor } from '../../utils/constants'
import TripActions from './TripActions'
import TripEditor from './TripEditor'
import TripHero from './TripHero'
import TripSummary from './TripSummary'
import ExpenseTracker from './ExpenseTracker'
import PackingList from './PackingList'
import ReservationsVault from './ReservationsVault'
import styles from './TripDetailsPage.module.css'

export default function TripDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { user } = useAuth()
  const [emailing, setEmailing] = useState(false)
  const load = useCallback((signal) => getTrip(id, signal), [id])
  const { data: trip, error, loading, retry, setData: setTrip } = useResource(load)
  const [activeTab, setActiveTab] = useState('itinerary')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
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
    if (confirmation) notify(confirmation)
  }

  async function handleStatusChange(status) {
    try {
      await saveChanges({ status }, `Trip marked as ${labelFor(status).toLowerCase()}`)
    } catch (statusError) {
      notify(statusError.message, 'error')
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const duplicated = await duplicateTrip(trip.id)
      notify('Trip duplicated successfully!')
      navigate(`/trips/${duplicated.id}`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setDuplicating(false)
    }
  }

  function handleShare() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
      notify('Trip link copied to clipboard!')
    } else {
      notify('Share link: ' + window.location.href)
    }
  }

  async function handleMoveItem(dayNum, fromIdx, toIdx) {
    const newItinerary = trip.itinerary.map((day) => {
      if (day.day !== dayNum) return day
      const newItems = [...day.items]
      const [moved] = newItems.splice(fromIdx, 1)
      newItems.splice(toIdx, 0, moved)
      return { ...day, items: newItems }
    })
    await saveChanges({ itinerary: newItinerary }, 'Itinerary order updated')
  }

  async function handleRemoveItem(dayNum, itemIdx) {
    const newItinerary = trip.itinerary.map((day) => {
      if (day.day !== dayNum) return day
      const newItems = day.items.filter((_, idx) => idx !== itemIdx)
      return { ...day, items: newItems }
    })
    await saveChanges({ itinerary: newItinerary }, 'Activity removed')
  }

  async function handleAddItem(dayNum, newItem) {
    const newItinerary = trip.itinerary.map((day) => {
      if (day.day !== dayNum) return day
      return { ...day, items: [...day.items, newItem] }
    })
    await saveChanges({ itinerary: newItinerary }, `Added "${newItem.name}" to Day ${dayNum}`)
  }

  async function handleReorderDay(dayNum, newItems) {
    const newItinerary = trip.itinerary.map((day) => {
      if (day.day !== dayNum) return day
      return { ...day, items: newItems }
    })
    await saveChanges({ itinerary: newItinerary }, `Day ${dayNum} route optimized`)
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

  async function handleEmail() {
    setEmailing(true)
    try {
      const msg = await emailTripPlan(trip.id, user?.email)
      notify(msg || 'Trip plan emailed to your inbox!')
    } catch (err) {
      notify(err.message || 'Could not send email', 'error')
    } finally {
      setEmailing(false)
    }
  }

  function handleCalendarExport() {
    exportTripToIcs(trip)
    notify('Calendar (.ics) downloaded! Ready to add to Google, Apple or Outlook Calendar.')
  }

  return (
    <article>
      <TripHero trip={trip} />

      <div className={`container ${styles.body}`}>
        <TripActions
          status={trip.status}
          onStatusChange={handleStatusChange}
          onDuplicate={handleDuplicate}
          onShare={handleShare}
          onEmail={handleEmail}
          onExportCalendar={handleCalendarExport}
          onDelete={() => setConfirmingDelete(true)}
          duplicating={duplicating}
          emailing={emailing}
        />
        <TripSummary trip={trip} />

        {/* Tab Navigation */}
        <nav className={styles.tabNav} aria-label="Trip workspace sections">
          <button
            type="button"
            className={`${styles.tabLink} ${activeTab === 'itinerary' ? styles.tabLinkActive : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            <Calendar size={16} aria-hidden="true" />
            Itinerary & Map
          </button>
          <button
            type="button"
            className={`${styles.tabLink} ${activeTab === 'expenses' ? styles.tabLinkActive : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Wallet size={16} aria-hidden="true" />
            Expenses & Splitting
          </button>
          <button
            type="button"
            className={`${styles.tabLink} ${activeTab === 'packing' ? styles.tabLinkActive : ''}`}
            onClick={() => setActiveTab('packing')}
          >
            <Package size={16} aria-hidden="true" />
            Packing Checklist
          </button>
          <button
            type="button"
            className={`${styles.tabLink} ${activeTab === 'reservations' ? styles.tabLinkActive : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <FileCheck size={16} aria-hidden="true" />
            Bookings Vault
          </button>
          <button
            type="button"
            className={`${styles.tabLink} ${activeTab === 'assistant' ? styles.tabLinkActive : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            <Bot size={16} aria-hidden="true" />
            AI Assistant
          </button>
          <button
            type="button"
            className={`${styles.tabLink} ${activeTab === 'notes' ? styles.tabLinkActive : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <Settings size={16} aria-hidden="true" />
            Notes & Details
          </button>
        </nav>

        {/* Tab Contents */}
        {activeTab === 'itinerary' && (
          <div className={styles.columns}>
            <section aria-labelledby="itinerary-heading">
              <h2 id="itinerary-heading" className={styles.sectionHeading}>
                Day-by-Day Timeline
              </h2>
              <Itinerary
                days={trip.itinerary}
                layout="stacked"
                editable={true}
                onMoveItem={handleMoveItem}
                onRemoveItem={handleRemoveItem}
                onAddItem={handleAddItem}
                onReorderDay={handleReorderDay}
              />
            </section>

            <aside className={styles.side} aria-label="Map and Budget Overview">
              <WeatherWidget
                location={trip.destination?.location}
                destinationName={trip.destination?.name}
                bestSeason={trip.destination?.bestSeason}
              />
              <InteractiveMap destination={trip.destination} days={trip.itinerary} />
              <section aria-labelledby="budget-summary-heading">
                <h3 id="budget-summary-heading" className={styles.sectionHeading}>
                  Budget Overview
                </h3>
                <BudgetBreakdown
                  budget={trip.budget}
                  travelers={trip.travelers}
                  days={trip.days}
                  destination={trip.destination}
                />
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className={styles.columns}>
            <section aria-labelledby="expenses-tab-heading">
              <ExpenseTracker trip={trip} />
            </section>
            <aside className={styles.side} aria-label="Budget Breakdown">
              <section aria-labelledby="budget-breakdown-heading">
                <h3 id="budget-breakdown-heading" className={styles.sectionHeading}>
                  Budget Estimate
                </h3>
                <BudgetBreakdown
                  budget={trip.budget}
                  travelers={trip.travelers}
                  days={trip.days}
                  destination={trip.destination}
                />
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'packing' && (
          <div>
            <PackingList trip={trip} onSave={(changes) => saveChanges(changes, 'Packing list updated')} />
          </div>
        )}

        {activeTab === 'reservations' && (
          <div>
            <ReservationsVault
              trip={trip}
              onSave={(changes) => saveChanges(changes, 'Reservations updated')}
            />
          </div>
        )}

        {activeTab === 'assistant' && (
          <div style={{ maxWidth: '48rem', marginInline: 'auto' }}>
            <AIAssistant trip={trip} />
          </div>
        )}

        {activeTab === 'notes' && (
          <div style={{ maxWidth: '38rem', marginInline: 'auto' }}>
            <TripEditor trip={trip} onSave={(changes) => saveChanges(changes, 'Trip details saved')} />
          </div>
        )}
      </div>

      {confirmingDelete && (
        <Dialog
          title="Delete this trip?"
          description={`"${trip.title}" and its itinerary, budget, expenses, and reservations will be permanently removed.`}
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
