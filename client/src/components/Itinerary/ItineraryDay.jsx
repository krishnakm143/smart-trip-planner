import { useState } from 'react'
import { Car, ChevronDown, ChevronUp, Coffee, Plus, Trash2, Utensils, Zap } from 'lucide-react'
import { formatWeekday } from '../../utils/formatDate'
import { formatFee } from '../../utils/formatCurrency'
import { describeBreaks, formatClock, formatDuration, formatKm } from '../../utils/time'
import { ACTIVITY_TYPES, labelFor } from '../../utils/constants'
import { optimizeDayRoute } from '../../utils/routeOptimizer'
import Button from '../ui/Button'
import styles from './ItineraryDay.module.css'

function TravelLeg({ minutes, km }) {
  return (
    <li className={styles.leg}>
      <span className={styles.legRail} aria-hidden="true" />
      <p className={styles.legText}>
        <Car aria-hidden="true" />
        <span className="visually-hidden">Travel to the next stop:</span>
        {minutes} min · {formatKm(km)}
      </p>
    </li>
  )
}

function Break({ kind, label }) {
  const Icon = kind === 'lunch' ? Utensils : Coffee
  return (
    <li className={styles.lunch}>
      <span className={styles.legRail} aria-hidden="true" />
      <p className={styles.lunchText}>
        <Icon aria-hidden="true" />
        {label}
      </p>
    </li>
  )
}

function Stop({ item, position, editable, isFirst, isLast, onMoveUp, onMoveDown, onRemove }) {
  return (
    <li className={styles.stop}>
      <p className={styles.time}>
        <time>{formatClock(item.startTime)}</time>
        <span className={styles.timeEnd}>
          to <time>{formatClock(item.endTime)}</time>
        </span>
      </p>
      <span className={styles.marker} aria-hidden="true">
        {position}
      </span>
      <div className={styles.stopBody}>
        <div className={styles.stopHeader}>
          <h4 className={styles.stopName}>{item.name}</h4>
          {editable && (
            <div className={styles.itemControls}>
              <button
                type="button"
                className={styles.ctrlBtn}
                title="Move up"
                disabled={isFirst}
                onClick={onMoveUp}
              >
                <ChevronUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.ctrlBtn}
                title="Move down"
                disabled={isLast}
                onClick={onMoveDown}
              >
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.ctrlBtn} ${styles.deleteBtn}`}
                title="Remove activity"
                onClick={onRemove}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <p className={styles.stopMeta}>
          <span className={styles.type}>{labelFor(item.type)}</span>
          <span>{formatDuration(item.durationHours)}</span>
          <span>{formatFee(item.entryFee)}</span>
          {item.isCustom && (
            <span style={{ color: 'var(--marigold-ink, #b45309)', fontSize: '0.75rem', fontWeight: 600 }}>
              Custom
            </span>
          )}
        </p>
        {item.notes && (
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft, #64748b)', marginTop: '0.25rem' }}>
            {item.notes}
          </p>
        )}
      </div>
    </li>
  )
}

function calculateEndTime(startTime, durationHours) {
  const [h, m] = startTime.split(':').map(Number)
  const totalMins = h * 60 + m + Math.round(durationHours * 60)
  const endH = Math.floor(totalMins / 60) % 24
  const endM = totalMins % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

export default function ItineraryDay({
  day,
  headingId,
  editable = false,
  onMoveItem,
  onRemoveItem,
  onAddItem,
  onReorderDay,
}) {
  const { items = [] } = day
  const breaks = describeBreaks(items)
  const [adding, setAdding] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'sightseeing',
    durationHours: 1.5,
    entryFee: 0,
    startTime: '10:00',
    notes: '',
  })

  function handleOptimize() {
    if (!onReorderDay || items.length < 3) return
    setOptimizing(true)
    try {
      const optimized = optimizeDayRoute(items)
      onReorderDay(day.day, optimized)
    } finally {
      setTimeout(() => setOptimizing(false), 300)
    }
  }

  function handleAddSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return

    const newItem = {
      name: form.name.trim(),
      type: form.type,
      durationHours: Number(form.durationHours) || 1,
      entryFee: Number(form.entryFee) || 0,
      startTime: form.startTime || '10:00',
      endTime: calculateEndTime(form.startTime || '10:00', Number(form.durationHours) || 1),
      travelKmFromPrev: 0,
      travelMinutesFromPrev: 0,
      isCustom: true,
      notes: form.notes ? form.notes.trim() : '',
    }

    onAddItem?.(day.day, newItem)
    setForm({
      name: '',
      type: 'sightseeing',
      durationHours: 1.5,
      entryFee: 0,
      startTime: '10:00',
      notes: '',
    })
    setAdding(false)
  }

  return (
    <section className={styles.day} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h3 id={headingId} className={styles.title}>
          Day {day.day}
          <span className={styles.date}>{formatWeekday(day.date)}</span>
        </h3>
        <div className={styles.headerRight}>
          {items.length > 0 && (
            <p className={styles.totals}>
              {formatDuration(day.totalVisitHours)} of visits
              {day.totalTravelKm > 0 && `, ${formatKm(day.totalTravelKm)} on the road`}
            </p>
          )}
          {editable && items.length >= 3 && onReorderDay && (
            <button
              type="button"
              className={styles.optimizeBtn}
              onClick={handleOptimize}
              disabled={optimizing}
              title="Automatically arrange stops in the shortest geographical sequence"
            >
              <Zap size={13} aria-hidden="true" />
              {optimizing ? 'Optimizing…' : 'Optimize Route'}
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <p className={styles.freeDay}>{day.note || 'Free day — explore at your own pace'}</p>
      ) : (
        <ol className={styles.timeline}>
          {items.flatMap((item, index) => {
            const previous = items[index - 1]
            const rows = []
            if (breaks[index]) rows.push(<Break key={`break-${index}`} {...breaks[index]} />)
            if (previous && item.travelMinutesFromPrev > 0) {
              rows.push(
                <TravelLeg
                  key={`leg-${index}`}
                  minutes={item.travelMinutesFromPrev}
                  km={item.travelKmFromPrev}
                />,
              )
            }
            rows.push(
              <Stop
                key={`${item.name}-${item.startTime}-${index}`}
                item={item}
                position={index + 1}
                editable={editable}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onMoveUp={() => onMoveItem?.(day.day, index, index - 1)}
                onMoveDown={() => onMoveItem?.(day.day, index, index + 1)}
                onRemove={() => onRemoveItem?.(day.day, index)}
              />,
            )
            return rows
          })}
        </ol>
      )}

      {items.length > 0 && day.note && <p className={styles.note}>{day.note}</p>}

      {editable && (
        <div className={styles.addActivitySection}>
          {!adding ? (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden="true" />
              Add custom stop to Day {day.day}
            </Button>
          ) : (
            <form className={styles.addForm} onSubmit={handleAddSubmit}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Add Activity to Day {day.day}</h4>
              <input
                required
                type="text"
                placeholder="Activity or Place Name (e.g. Sunset Boat Cruise)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className={styles.formGrid}>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  placeholder="Duration (hrs)"
                  value={form.durationHours}
                  onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Entry fee (₹)"
                  value={form.entryFee}
                  onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
                />
              </div>
              <input
                type="text"
                placeholder="Optional notes or directions"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <div className={styles.formActions}>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Add Activity
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
