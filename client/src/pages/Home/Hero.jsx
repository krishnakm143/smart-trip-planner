import { useEffect, useState } from 'react'
import { Car } from 'lucide-react'
import Button from '../../components/ui/Button'
import DestinationImage from '../../components/DestinationImage/DestinationImage'
import styles from './Hero.module.css'

// Each slide pairs a destination photo with the first stops of a day the planner produced for it.
const SLIDES = [
  {
    slug: 'jaipur',
    name: 'Jaipur',
    alt: 'Hawa Mahal in Jaipur, Rajasthan',
    day: [
      { time: '9:00 am', name: 'Amber Fort', detail: '2 hr 30 min, ₹100 entry' },
      { leg: '12 min · 4.6 km' },
      { time: '11:45 am', name: 'Jal Mahal viewpoint', detail: '45 min, free entry' },
      { leg: '15 min · 5.2 km' },
      { time: '12:45 pm', name: 'Hawa Mahal', detail: '1 hr, ₹50 entry' },
    ],
  },
  {
    slug: 'varanasi',
    name: 'Varanasi',
    alt: 'Ghats of Varanasi, Uttar Pradesh',
    day: [
      { time: '9:00 am', name: 'Kashi Vishwanath Temple', detail: '2 hr, free entry' },
      { leg: '10 min · 4.4 km' },
      { time: '11:10 am', name: 'Ganga boat ride, Assi Ghat', detail: '1 hr 30 min, ₹300' },
      { leg: '10 min · 4.6 km' },
      { time: '12:50 pm', name: 'Kachori Gali food walk', detail: '1 hr 30 min, free entry' },
    ],
  },
  {
    slug: 'goa',
    name: 'Goa',
    alt: 'A beach in Goa',
    day: [
      { time: '9:00 am', name: 'Basilica of Bom Jesus', detail: '1 hr, free entry' },
      { leg: '28 min · 24.2 km' },
      { time: '10:30 am', name: 'Fort Aguada', detail: '1 hr 30 min, free entry' },
      { leg: '28 min · 24.6 km' },
      { time: '12:30 pm', name: 'Se Cathedral', detail: '1 hr, free entry' },
    ],
  },
  {
    slug: 'manali',
    name: 'Manali',
    alt: 'Snow-covered slopes above Manali, Himachal Pradesh',
    day: [
      { time: '9:00 am', name: 'Rohtang Pass', detail: '5 hr, ₹550 entry' },
      { leg: '62 min · 62.3 km' },
      { time: '4:05 pm', name: 'Hadimba Devi Temple', detail: '1 hr, free entry' },
    ],
  },
]

const SLIDE_INTERVAL_MS = 3000

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Index of the slide on show. Advances on a timer unless paused or motion is reduced. */
function useSlideshow(count) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [count, paused])

  return { index, setIndex, setPaused }
}

export default function Hero() {
  const { index, setIndex, setPaused } = useSlideshow(SLIDES.length)
  const active = SLIDES[index]

  return (
    <section className={`container ${styles.hero}`}>
      <div className={styles.copy}>
        <h1 className={styles.headline}>Know your days and your rupees before you leave home.</h1>
        <p className={styles.lede}>
          Choose one of twelve Indian destinations and tell us your dates, group size and budget. You get a
          day-wise itinerary ordered to cut down on driving, and a cost estimate split into stay, food,
          transport and entry fees.
        </p>
        <div className={styles.actions}>
          <Button to="/plan" size="lg">
            Plan a trip
          </Button>
          <Button to="/destinations" size="lg" variant="secondary">
            Browse destinations
          </Button>
        </div>
      </div>

      <div
        className={styles.visual}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className={styles.photo}>
          {SLIDES.map((slide, i) => (
            <div
              key={slide.slug}
              className={`${styles.frame} ${i === index ? styles.frameActive : ''}`}
              aria-hidden={i !== index}
            >
              <DestinationImage
                src={`/images/destinations/${slide.slug}.jpg`}
                name={slide.name}
                alt={slide.alt}
                eager
              />
            </div>
          ))}
        </div>

        <aside className={styles.sample} aria-label={`A sample day in ${active.name}`}>
          <div key={active.slug} className={styles.sampleBody}>
            <p className={styles.sampleTitle}>A day in {active.name}, as planned here</p>
            <ol className={styles.sampleList}>
              {active.day.map((row) =>
                row.leg ? (
                  <li key={row.leg + row.time} className={styles.sampleLeg}>
                    <Car aria-hidden="true" />
                    {row.leg}
                  </li>
                ) : (
                  <li key={row.name} className={styles.sampleStop}>
                    <span className={styles.sampleTime}>{row.time}</span>
                    <span>
                      <strong>{row.name}</strong>
                      <span className={styles.sampleDetail}>{row.detail}</span>
                    </span>
                  </li>
                ),
              )}
            </ol>
          </div>
        </aside>

        <div className={styles.dots} role="group" aria-label="Choose a sample destination">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.slug}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              aria-label={`Show ${slide.name}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
