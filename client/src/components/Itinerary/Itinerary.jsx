import { useId, useRef, useState } from 'react'
import { formatDate } from '../../utils/formatDate'
import ItineraryDay from './ItineraryDay'
import styles from './Itinerary.module.css'

function StackedDays({ days, baseId }) {
  return (
    <div className={styles.stack}>
      {days.map((day) => (
        <ItineraryDay key={day.day} day={day} headingId={`${baseId}-day-${day.day}`} />
      ))}
    </div>
  )
}

function TabbedDays({ days, baseId }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabRefs = useRef([])
  const active = days[Math.min(activeIndex, days.length - 1)]

  function handleKeyDown(event) {
    const moves = { ArrowRight: 1, ArrowLeft: -1 }
    let next = null
    if (event.key in moves) next = (activeIndex + moves[event.key] + days.length) % days.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = days.length - 1
    if (next === null) return
    event.preventDefault()
    setActiveIndex(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Itinerary days" onKeyDown={handleKeyDown}>
        {days.map((day, index) => (
          <button
            key={day.day}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${day.day}`}
            className={styles.tab}
            aria-selected={day.day === active.day}
            aria-controls={`${baseId}-panel`}
            tabIndex={day.day === active.day ? 0 : -1}
            onClick={() => setActiveIndex(index)}
          >
            <span className={styles.tabDay}>Day {day.day}</span>
            <span className={styles.tabDate}>{formatDate(day.date).replace(/ \d{4}$/, '')}</span>
          </button>
        ))}
      </div>
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active.day}`} tabIndex={0} className={styles.panel}>
        <ItineraryDay day={active} headingId={`${baseId}-day-${active.day}`} />
      </div>
    </>
  )
}

export default function Itinerary({ days, layout = 'tabs' }) {
  const baseId = useId()
  const Layout = layout === 'stacked' || days.length === 1 ? StackedDays : TabbedDays
  return <Layout days={days} baseId={baseId} />
}
