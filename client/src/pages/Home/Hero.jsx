import { Car } from 'lucide-react'
import Button from '../../components/ui/Button'
import DestinationImage from '../../components/DestinationImage/DestinationImage'
import styles from './Hero.module.css'

const SAMPLE_DAY = [
  { time: '9:00 am', name: 'Amber Fort', detail: '2 hr 30 min, ₹100 entry' },
  { leg: '12 min · 4.6 km' },
  { time: '11:45 am', name: 'Jal Mahal viewpoint', detail: '45 min, free entry' },
  { leg: '15 min · 5.2 km' },
  { time: '12:45 pm', name: 'Hawa Mahal', detail: '1 hr, ₹50 entry' },
]

export default function Hero() {
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

      <div className={styles.visual}>
        <div className={styles.photo}>
          <DestinationImage src="/images/destinations/jaipur.jpg" name="Jaipur" alt="Jaipur, Rajasthan" eager />
        </div>
        <aside className={styles.sample} aria-label="A sample day in Jaipur">
          <p className={styles.sampleTitle}>A day in Jaipur, as planned here</p>
          <ol className={styles.sampleList}>
            {SAMPLE_DAY.map((row) =>
              row.leg ? (
                <li key={row.leg} className={styles.sampleLeg}>
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
        </aside>
      </div>
    </section>
  )
}
