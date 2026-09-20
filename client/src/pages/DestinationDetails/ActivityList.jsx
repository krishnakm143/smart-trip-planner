import { useMemo, useState } from 'react'
import { Clock, Star, Sunrise, Ticket } from 'lucide-react'
import Chip from '../../components/ui/Chip'
import EmptyState from '../../components/states/EmptyState'
import { formatFee } from '../../utils/formatCurrency'
import { formatDuration } from '../../utils/time'
import { ACTIVITY_TYPES } from '../../utils/constants'
import styles from './ActivityList.module.css'

const BEST_TIME_LABELS = { morning: 'Best in the morning', afternoon: 'Best in the afternoon', evening: 'Best in the evening' }

function groupByType(activities) {
  return ACTIVITY_TYPES.map((type) => ({
    ...type,
    activities: activities.filter((activity) => activity.type === type.value),
  })).filter((group) => group.activities.length > 0)
}

export default function ActivityList({ activities }) {
  const [activeType, setActiveType] = useState('')
  const groups = useMemo(() => groupByType(activities), [activities])
  const visibleGroups = activeType ? groups.filter((group) => group.value === activeType) : groups

  if (activities.length === 0) {
    return <EmptyState title="No places listed yet" message="Activities for this destination have not been added." />
  }

  return (
    <>
      <fieldset className={styles.filters}>
        <legend className="visually-hidden">Filter by type</legend>
        <Chip selected={activeType === ''} onToggle={() => setActiveType('')}>
          All ({activities.length})
        </Chip>
        {groups.map((group) => (
          <Chip
            key={group.value}
            selected={activeType === group.value}
            onToggle={() => setActiveType(activeType === group.value ? '' : group.value)}
          >
            {group.label} ({group.activities.length})
          </Chip>
        ))}
      </fieldset>

      <div className={styles.groups}>
        {visibleGroups.map((group) => (
          <section key={group.value} className={styles.group} aria-label={group.label}>
            <h3 className={styles.groupTitle}>{group.label}</h3>
            <ul className={styles.list}>
              {group.activities.map((activity) => (
                <li key={activity.id} className={styles.activity}>
                  <div className={styles.activityHead}>
                    <h4 className={styles.activityName}>{activity.name}</h4>
                    <span className={styles.rating}>
                      <Star aria-hidden="true" />
                      <span className="visually-hidden">Rated</span>
                      {activity.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className={styles.description}>{activity.description}</p>
                  <ul className={styles.meta}>
                    <li>
                      <Clock aria-hidden="true" />
                      {formatDuration(activity.durationHours)}
                    </li>
                    <li>
                      <Ticket aria-hidden="true" />
                      {formatFee(activity.entryFee)}
                    </li>
                    {BEST_TIME_LABELS[activity.bestTime] && (
                      <li>
                        <Sunrise aria-hidden="true" />
                        {BEST_TIME_LABELS[activity.bestTime]}
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
