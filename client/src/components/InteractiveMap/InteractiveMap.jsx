import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { formatFee } from '../../utils/formatCurrency'
import { labelFor } from '../../utils/constants'
import styles from './InteractiveMap.module.css'

const DAY_COLORS = [
  '#0284c7', // Sky
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
]

function createCustomIcon(dayNum, stopNum, color) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: ${color};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 11px;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        transform: translate(-14px, -14px);
        font-family: inherit;
      ">
        ${dayNum}.${stopNum}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function createDestinationIcon() {
  return L.divIcon({
    className: 'custom-dest-marker',
    html: `
      <div style="
        background: #e11d48;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 6px rgba(0,0,0,0.35);
        transform: translate(-16px, -16px);
      ">
        ★
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function InteractiveMap({ destination, days = [] }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [selectedDay, setSelectedDay] = useState('all')
  const [mapError, setMapError] = useState(false)

  const lat = destination?.location?.lat ?? 20.5937
  const lng = destination?.location?.lng ?? 78.9629

  useEffect(() => {
    if (!mapContainerRef.current) return

    let map = mapInstanceRef.current
    if (!map) {
      try {
        map = L.map(mapContainerRef.current, {
          scrollWheelZoom: false,
        }).setView([lat, lng], 12)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map)

        mapInstanceRef.current = map
      } catch (err) {
        console.warn('Map initialization failed, falling back:', err)
        setTimeout(() => setMapError(true), 0)
        return
      }
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng])

  // Update markers & polylines when selectedDay or days change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer)
      }
    })

    const bounds = []

    // Add destination center marker
    if (destination?.location) {
      const destMarker = L.marker([destination.location.lat, destination.location.lng], {
        icon: createDestinationIcon(),
      }).addTo(map)
      destMarker.bindPopup(`<strong>${destination.name}</strong><br/>${destination.state}`)
      bounds.push([destination.location.lat, destination.location.lng])
    }

    const filteredDays =
      selectedDay === 'all'
        ? days
        : days.filter((d) => String(d.day) === String(selectedDay))

    filteredDays.forEach((day) => {
      const dayColor = DAY_COLORS[(day.day - 1) % DAY_COLORS.length]
      const dayCoords = []

      day.items?.forEach((item, stopIdx) => {
        const coords = item.location?.coordinates
          ? [item.location.coordinates[1], item.location.coordinates[0]] // geoJSON [lng, lat]
          : item.location?.lat && item.location?.lng
            ? [item.location.lat, item.location.lng]
            : null

        if (coords) {
          dayCoords.push(coords)
          bounds.push(coords)

          const marker = L.marker(coords, {
            icon: createCustomIcon(day.day, stopIdx + 1, dayColor),
          }).addTo(map)

          const googleNavUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${item.name} ${destination?.name || ''}`,
          )}`

          marker.bindPopup(`
            <div style="font-family: sans-serif; line-height: 1.4; min-width: 170px;">
              <span style="font-size: 11px; font-weight: 700; color: ${dayColor}; text-transform: uppercase;">
                Day ${day.day} · Stop ${stopIdx + 1}
              </span>
              <h4 style="margin: 4px 0 2px; font-size: 14px; font-weight: 600;">${item.name}</h4>
              <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                ${item.startTime} – ${item.endTime} · ${labelFor(item.type)}
              </p>
              ${item.entryFee ? `<p style="margin: 0 0 6px; font-size: 12px; font-weight: 600;">Entry: ${formatFee(item.entryFee)}</p>` : ''}
              <a href="${googleNavUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #0284c7; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
                Open in Maps ↗
              </a>
            </div>
          `)
        }
      })

      if (dayCoords.length > 1) {
        L.polyline(dayCoords, {
          color: dayColor,
          weight: 4,
          opacity: 0.75,
          dashArray: '6, 8',
        }).addTo(map)
      }
    })

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      } catch {
        // Fallback zoom if fitBounds fails
      }
    }
  }, [days, selectedDay, destination])

  if (mapError) {
    return (
      <section className={styles.wrapper} aria-label="Trip Map">
        <div className={styles.mapFallback}>
          <MapPin size={32} style={{ marginBottom: '8px', color: '#0284c7' }} />
          <h3>Interactive Map</h3>
          <p>Location points for {destination?.name || 'this trip'} are organized in your daily itinerary timeline.</p>
        </div>
      </section>
    )
  }

  const allStops = days.flatMap((d) => d.items || []).filter((i) => i.location)

  return (
    <section className={styles.wrapper} aria-label="Interactive Trip Map">
      <div className={styles.header}>
        <h3 className={styles.title}>
          <MapPin size={18} aria-hidden="true" style={{ color: 'var(--primary, #0284c7)' }} />
          Itinerary Map · {destination?.name}
        </h3>

        {days.length > 1 && (
          <div className={styles.dayFilter} role="group" aria-label="Filter map by day">
            <button
              type="button"
              className={`${styles.filterBtn} ${selectedDay === 'all' ? styles.filterBtnActive : ''}`}
              onClick={() => setSelectedDay('all')}
            >
              All Days ({allStops.length} stops)
            </button>
            {days.map((day) => (
              <button
                key={day.day}
                type="button"
                className={`${styles.filterBtn} ${selectedDay === String(day.day) ? styles.filterBtnActive : ''}`}
                onClick={() => setSelectedDay(String(day.day))}
              >
                Day {day.day}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={mapContainerRef} className={styles.mapContainer} />

      <div className={styles.stopsSummary}>
        {days.map((day, idx) => (
          <span key={day.day} className={styles.stopLegend}>
            <span
              className={styles.legendDot}
              style={{ background: DAY_COLORS[idx % DAY_COLORS.length] }}
            />
            Day {day.day} ({day.items?.length || 0} stops)
          </span>
        ))}
      </div>
    </section>
  )
}
