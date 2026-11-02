import { Calendar, Copy, Mail, Printer, Share2, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import { TRIP_STATUSES } from '../../utils/constants'
import styles from './TripActions.module.css'

export default function TripActions({
  status,
  onStatusChange,
  onDuplicate,
  onShare,
  onEmail,
  onExportCalendar,
  onDelete,
  duplicating,
  emailing,
}) {
  return (
    <div className={styles.actions}>
      <div className={styles.status}>
        <label htmlFor="trip-status">Status</label>
        <select id="trip-status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
          {TRIP_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.buttons}>
        <Button variant="ghost" size="sm" onClick={onEmail} busy={emailing} title="Email complete itinerary to your inbox">
          <Mail size={14} aria-hidden="true" />
          Email Plan
        </Button>
        <Button variant="ghost" size="sm" onClick={onExportCalendar} title="Download .ics file for Google, Apple or Outlook Calendar">
          <Calendar size={14} aria-hidden="true" />
          Add to Calendar
        </Button>
        <Button variant="ghost" size="sm" onClick={onShare}>
          <Share2 size={14} aria-hidden="true" />
          Share
        </Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate} busy={duplicating}>
          <Copy size={14} aria-hidden="true" />
          Duplicate
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.print()} title="Print or save as PDF">
          <Printer size={14} aria-hidden="true" />
          Print / PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className={styles.delete}>
          <Trash2 size={14} aria-hidden="true" />
          Delete trip
        </Button>
      </div>
    </div>
  )
}
