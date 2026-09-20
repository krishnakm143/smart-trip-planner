import { useState } from 'react'
import Button from '../../components/ui/Button'
import Field from '../../components/ui/Field'
import { fieldErrorsFrom } from '../../utils/fieldErrors'
import { LIMITS } from '../../utils/constants'
import styles from './TripEditor.module.css'

export default function TripEditor({ trip, onSave }) {
  const [title, setTitle] = useState(trip.title)
  const [notes, setNotes] = useState(trip.notes ?? '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const changes = {}
  if (title.trim() !== trip.title) changes.title = title.trim()
  if (notes !== (trip.notes ?? '')) changes.notes = notes
  const dirty = Object.keys(changes).length > 0

  async function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim()) {
      setErrors({ title: 'Give the trip a title.' })
      return
    }

    setSaving(true)
    setErrors({})
    try {
      await onSave(changes)
    } catch (error) {
      setErrors(fieldErrorsFrom(error, 'notes'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="editor-heading" className={trip.notes ? undefined : styles.screenOnly}>
      <h2 id="editor-heading" className={styles.heading}>
        Trip notes
      </h2>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Trip title" error={errors.title}>
          {(control) => (
            <input
              {...control}
              type="text"
              maxLength={LIMITS.titleLength}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>
        <Field
          label="Notes"
          error={errors.notes}
          hint={`Bookings, packing, people to call. ${notes.length} of ${LIMITS.notesLength} characters.`}
        >
          {(control) => (
            <textarea
              {...control}
              rows={5}
              maxLength={LIMITS.notesLength}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          )}
        </Field>
        <Button type="submit" variant="secondary" disabled={!dirty} busy={saving}>
          {saving ? 'Saving changes' : 'Save changes'}
        </Button>
      </form>

      {trip.notes && <p className={styles.printNotes}>{trip.notes}</p>}
    </section>
  )
}
