export const CATEGORIES = [
  { value: 'hill-station', label: 'Hill stations' },
  { value: 'beach', label: 'Beaches' },
  { value: 'heritage', label: 'Heritage' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'nature', label: 'Nature' },
  { value: 'desert', label: 'Desert' },
  { value: 'adventure', label: 'Adventure' },
]

export const ACTIVITY_TYPES = [
  { value: 'sightseeing', label: 'Sightseeing' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'culture', label: 'Culture' },
  { value: 'nature', label: 'Nature' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Shopping' },
]

export const BUDGET_TIERS = [
  { value: 'economy', label: 'Economy', summary: 'Hostels and guesthouses, local buses, dhaba meals.' },
  { value: 'standard', label: 'Standard', summary: 'Three-star hotels, cabs for the day, sit-down restaurants.' },
  { value: 'luxury', label: 'Luxury', summary: 'Resorts and heritage stays, private car, fine dining.' },
]

export const PACES = [
  { value: 'relaxed', label: 'Relaxed', hours: 6 },
  { value: 'balanced', label: 'Balanced', hours: 8 },
  { value: 'packed', label: 'Packed', hours: 10 },
]

export const TRIP_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PROVIDER_LABELS = {
  local: 'Curated local data',
  osm: 'OpenStreetMap',
  google: 'Google Places',
}

export const LIMITS = {
  maxDays: 14,
  minTravelers: 1,
  maxTravelers: 12,
  titleLength: 80,
  notesLength: 1000,
}

const labelIndex = new Map(
  [...CATEGORIES, ...ACTIVITY_TYPES, ...BUDGET_TIERS, ...PACES, ...TRIP_STATUSES].map((option) => [
    option.value,
    option.label,
  ]),
)

export const labelFor = (value) => labelIndex.get(value) ?? value
