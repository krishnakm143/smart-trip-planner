import { useCallback } from 'react'
import { CloudSun, Droplets, RefreshCw, Wind } from 'lucide-react'
import { useResource } from '../../hooks/useResource'
import styles from './WeatherWidget.module.css'

function interpretWmoCode(code) {
  if (code === 0) return { label: 'Clear Sky', icon: '☀️' }
  if (code === 1) return { label: 'Mainly Clear', icon: '🌤️' }
  if (code === 2) return { label: 'Partly Cloudy', icon: '⛅' }
  if (code === 3) return { label: 'Overcast', icon: '☁️' }
  if (code === 45 || code === 48) return { label: 'Foggy', icon: '🌫️' }
  if (code >= 51 && code <= 55) return { label: 'Drizzle', icon: '🌦️' }
  if (code >= 61 && code <= 65) return { label: 'Rain', icon: '🌧️' }
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: '❄️' }
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: '🌧️' }
  if (code >= 85 && code <= 86) return { label: 'Snow Showers', icon: '🌨️' }
  if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' }
  return { label: 'Fair', icon: '🌤️' }
}

function formatDayName(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function WeatherWidget({ location, destinationName, bestSeason }) {
  const lat = location?.lat
  const lng = location?.lng

  const load = useCallback(
    async (signal) => {
      if (!lat || !lng) return null
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&current_weather=true&timezone=auto`
      const res = await fetch(url, { signal })
      if (!res.ok) throw new Error('Weather fetch failed')
      return res.json()
    },
    [lat, lng],
  )

  const { data, error, loading, retry } = useResource(load)

  if (!lat || !lng) return null

  if (error || !data) {
    if (loading) {
      return (
        <div className={styles.weatherCard} aria-busy="true">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            Loading weather forecast for {destinationName}…
          </p>
        </div>
      )
    }

    return (
      <div className={styles.weatherCard}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <CloudSun size={16} aria-hidden="true" />
            <h4 className={styles.title}>Weather & Climate</h4>
          </div>
        </div>
        <p className={styles.offlineNotice}>
          Live forecast offline. {destinationName ? `${destinationName} is recommended in: ` : ''}
          <strong>{bestSeason || 'peak travel season'}</strong>.
        </p>
      </div>
    )
  }

  const current = data.current_weather
  const currentInfo = interpretWmoCode(current?.weathercode ?? 0)
  const daily = data.daily || {}
  const forecastDays = (daily.time || []).slice(0, 5).map((dateStr, idx) => ({
    date: dateStr,
    dayName: formatDayName(dateStr),
    maxTemp: Math.round(daily.temperature_2m_max?.[idx] ?? 0),
    minTemp: Math.round(daily.temperature_2m_min?.[idx] ?? 0),
    precip: daily.precipitation_sum?.[idx] ?? 0,
    info: interpretWmoCode(daily.weathercode?.[idx] ?? 0),
  }))

  return (
    <section className={styles.weatherCard} aria-label={`Weather forecast for ${destinationName}`}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <CloudSun size={16} aria-hidden="true" color="#0284c7" />
          <h4 className={styles.title}>Live Forecast · {destinationName}</h4>
        </div>
        <button
          type="button"
          onClick={retry}
          disabled={loading}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.2rem' }}
          title="Refresh forecast"
        >
          <RefreshCw size={13} className={loading ? 'spinning' : ''} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.currentSection}>
        <div className={styles.tempDisplay}>
          <span className={styles.weatherEmoji} role="img" aria-label={currentInfo.label}>
            {currentInfo.icon}
          </span>
          <div>
            <div className={styles.tempValue}>{Math.round(current?.temperature ?? 0)}°C</div>
            <div className={styles.weatherDesc}>{currentInfo.label}</div>
          </div>
        </div>

        <div className={styles.currentMeta}>
          <div>
            <Wind size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
            {Math.round(current?.windspeed ?? 0)} km/h wind
          </div>
          {bestSeason && (
            <div style={{ marginTop: '0.25rem', color: '#0369a1' }}>
              Best season: {bestSeason}
            </div>
          )}
        </div>
      </div>

      <ul className={styles.forecastList}>
        {forecastDays.map((d) => (
          <li key={d.date} className={styles.forecastDay}>
            <span className={styles.dayName}>{d.dayName}</span>
            <span className={styles.dayEmoji} title={d.info.label}>
              {d.info.icon}
            </span>
            <div className={styles.dayTemps}>
              <span>{d.maxTemp}°</span>
              <span className={styles.minTemp}>{d.minTemp}°</span>
            </div>
            {d.precip > 0 && (
              <span className={styles.precip} title={`${d.precip}mm rain`}>
                <Droplets size={10} />
                {Math.round(d.precip)}m
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
