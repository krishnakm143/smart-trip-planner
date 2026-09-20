import styles from './HowItWorks.module.css'

const STEPS = [
  {
    title: 'Say where, when and who',
    text: 'Pick a destination, your dates and the number of travellers. Choose economy, standard or luxury, the things you enjoy, and how full you want each day.',
  },
  {
    title: 'Get a plan for every day',
    text: 'Stops are scored against your interests, grouped so neighbours fall on the same day, and timed from 9 am with the drive between each one and an hour for lunch.',
  },
  {
    title: 'Check the cost, then save it',
    text: 'See what the trip costs in total and per person, split across stay, food, local transport and entry fees. Save it to My trips and add notes as plans firm up.',
  },
]

export default function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-heading">
      <div className="container">
        <h2 id="how-heading" className={styles.heading}>
          How a trip gets planned
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.text}>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
