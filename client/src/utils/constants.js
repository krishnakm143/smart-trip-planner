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

export const TRIP_MODES = [
  { value: 'solo', label: 'Solo Trip' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
  { value: 'friends', label: 'Friends' },
  { value: 'group', label: 'Group Tour' },
]

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI / GPay / Paytm' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Net Banking' },
  { value: 'other', label: 'Other' },
]

export const RESERVATION_TYPES = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel / Stay' },
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'car_rental', label: 'Car / Cab' },
  { value: 'activity', label: 'Activity' },
  { value: 'restaurant', label: 'Dining' },
  { value: 'other', label: 'Other' },
]

export const PACKING_CATEGORIES = [
  { value: 'clothing', label: 'Clothing' },
  { value: 'documents', label: 'Documents & Passes' },
  { value: 'electronics', label: 'Electronics & Tech' },
  { value: 'toiletries', label: 'Toiletries & Hygiene' },
  { value: 'medication', label: 'Health & First Aid' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other Essentials' },
]

export const EXPENSE_CATEGORIES = [
  { value: 'stay', label: 'Accommodation / Stay' },
  { value: 'transport', label: 'Local & Transit Transport' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'activities', label: 'Sightseeing & Activities' },
  { value: 'shopping', label: 'Shopping & Souvenirs' },
  { value: 'other', label: 'Miscellaneous' },
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
  [
    ...CATEGORIES,
    ...ACTIVITY_TYPES,
    ...BUDGET_TIERS,
    ...PACES,
    ...TRIP_STATUSES,
    ...TRIP_MODES,
    ...PAYMENT_METHODS,
    ...EXPENSE_CATEGORIES,
    ...RESERVATION_TYPES,
    ...PACKING_CATEGORIES,
  ].map((option) => [option.value, option.label]),
)

export const labelFor = (value) => labelIndex.get(value) ?? value
