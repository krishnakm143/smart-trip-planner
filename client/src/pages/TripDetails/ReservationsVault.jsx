import { useState } from 'react'
import {
  FileCheck,
  FileText,
  Hotel,
  Plane,
  Plus,
  Ticket,
  Train,
  Trash2,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../utils/formatCurrency'
import { RESERVATION_TYPES, labelFor } from '../../utils/constants'
import styles from './ReservationsVault.module.css'

function getIconForType(type) {
  switch (type) {
    case 'flight':
      return <Plane size={16} aria-hidden="true" />
    case 'hotel':
      return <Hotel size={16} aria-hidden="true" />
    case 'train':
      return <Train size={16} aria-hidden="true" />
    case 'activity':
      return <Ticket size={16} aria-hidden="true" />
    default:
      return <FileText size={16} aria-hidden="true" />
  }
}

export default function ReservationsVault({ trip, onSave }) {
  const [reservations, setReservations] = useState(trip.reservations || [])
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({
    type: 'hotel',
    title: '',
    provider: '',
    confirmationCode: '',
    startDateTime: '',
    endDateTime: '',
    cost: '',
    status: 'confirmed',
    notes: '',
  })

  function persist(updated) {
    setReservations(updated)
    onSave?.({ reservations: updated })
  }

  function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return

    const newRes = {
      id: `res-${Date.now()}`,
      type: form.type,
      title: form.title.trim(),
      provider: form.provider.trim(),
      confirmationCode: form.confirmationCode.trim(),
      startDateTime: form.startDateTime,
      endDateTime: form.endDateTime,
      cost: Number(form.cost) || 0,
      status: form.status,
      notes: form.notes.trim(),
    }

    persist([newRes, ...reservations])
    setForm({
      type: 'hotel',
      title: '',
      provider: '',
      confirmationCode: '',
      startDateTime: '',
      endDateTime: '',
      cost: '',
      status: 'confirmed',
      notes: '',
    })
    setShowAddForm(false)
  }

  function handleDelete(id) {
    persist(reservations.filter((r) => r.id !== id))
  }

  return (
    <section className={styles.wrapper} aria-labelledby="reservations-heading">
      <div className={styles.header}>
        <h2 id="reservations-heading" className={styles.title}>
          <FileCheck size={20} aria-hidden="true" style={{ color: 'var(--primary, #0284c7)' }} />
          Reservations & Bookings Vault
        </h2>
        <Button
          size="sm"
          variant={showAddForm ? 'ghost' : 'secondary'}
          onClick={() => setShowAddForm((v) => !v)}
        >
          {showAddForm ? (
            'Cancel'
          ) : (
            <>
              <Plus size={14} aria-hidden="true" />
              Add Reservation
            </>
          )}
        </Button>
      </div>

      {showAddForm && (
        <form className={styles.formBox} onSubmit={handleCreate}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Record a Booking</h3>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={{ width: '9rem' }}
            >
              {RESERVATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              required
              type="text"
              placeholder="Booking Title (e.g. Indigo 6E-241, Hotel Snow Valley)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>

          <div className={styles.formGrid}>
            <input
              type="text"
              placeholder="Provider (e.g. MakeMyTrip, Cleartrip)"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            />
            <input
              type="text"
              placeholder="Confirmation PNR / Code"
              value={form.confirmationCode}
              onChange={(e) => setForm({ ...form, confirmationCode: e.target.value })}
            />
            <input
              type="date"
              placeholder="Date / Check-in"
              value={form.startDateTime}
              onChange={(e) => setForm({ ...form, startDateTime: e.target.value })}
            />
            <input
              type="number"
              min="0"
              placeholder="Cost in ₹ (optional)"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="confirmed">Confirmed</option>
              <option value="tentative">Tentative</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Seat number, room type, or check-in instructions"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Booking
            </Button>
          </div>
        </form>
      )}

      {reservations.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', textAlign: 'center', marginBlock: '1.25rem' }}>
          No reservations recorded yet. Keep your flight PNRs, hotel bookings, and attraction tickets centralized here!
        </p>
      ) : (
        <ul className={styles.resList}>
          {reservations.map((res) => (
            <li key={res.id} className={styles.resCard}>
              <div>
                <div className={styles.resHeader}>
                  <span className={styles.resTypeBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {getIconForType(res.type)}
                    {labelFor(res.type)}
                  </span>
                  <h4 className={styles.resTitle}>{res.title}</h4>
                </div>

                <div className={styles.resDetails}>
                  {res.provider && <span>Provider: <strong>{res.provider}</strong></span>}
                  {res.confirmationCode && (
                    <span>
                      PNR/Code: <span className={styles.confirmationBox}>{res.confirmationCode}</span>
                    </span>
                  )}
                  {res.startDateTime && <span>Date: {res.startDateTime}</span>}
                  {res.cost > 0 && <span>Cost: {formatCurrency(res.cost)}</span>}
                  <span
                    className={
                      res.status === 'confirmed'
                        ? styles.statusConfirmed
                        : res.status === 'tentative'
                          ? styles.statusTentative
                          : styles.statusCancelled
                    }
                  >
                    ● {res.status.toUpperCase()}
                  </span>
                </div>

                {res.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    {res.notes}
                  </p>
                )}
              </div>

              <button
                type="button"
                className={styles.deleteBtn}
                title="Remove booking"
                onClick={() => handleDelete(res.id)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
