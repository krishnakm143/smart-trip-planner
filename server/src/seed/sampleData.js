// Sample accounts and saved trips so that every collection has records to
// show after seeding. All sample users share the demo password.
export const SAMPLE_PASSWORD = 'Demo@1234';

export const sampleUsers = [
  { name: 'Demo Traveller', email: 'demo@smarttrip.in' },
  { name: 'Aarav Patel', email: 'aarav.patel@smarttrip.in' },
  { name: 'Diya Shah', email: 'diya.shah@smarttrip.in' },
  { name: 'Kabir Mehta', email: 'kabir.mehta@smarttrip.in' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@smarttrip.in' },
];

// startInDays is counted from the day the seed runs, so sample trips are always upcoming.
export const sampleTrips = [
  {
    email: 'demo@smarttrip.in',
    slug: 'jaipur',
    startInDays: 21,
    days: 3,
    travelers: 2,
    budgetTier: 'standard',
    interests: ['culture', 'sightseeing'],
    pace: 'balanced',
  },
  {
    email: 'demo@smarttrip.in',
    slug: 'kutch',
    startInDays: 60,
    days: 4,
    travelers: 4,
    budgetTier: 'economy',
    interests: ['nature', 'culture'],
    pace: 'relaxed',
  },
  {
    email: 'aarav.patel@smarttrip.in',
    slug: 'goa',
    startInDays: 30,
    days: 5,
    travelers: 3,
    budgetTier: 'standard',
    interests: ['nature', 'food'],
    pace: 'relaxed',
  },
  {
    email: 'diya.shah@smarttrip.in',
    slug: 'rishikesh',
    startInDays: 14,
    days: 3,
    travelers: 2,
    budgetTier: 'economy',
    interests: ['adventure', 'spiritual'],
    pace: 'packed',
  },
  {
    email: 'kabir.mehta@smarttrip.in',
    slug: 'udaipur',
    startInDays: 45,
    days: 2,
    travelers: 2,
    budgetTier: 'luxury',
    interests: ['culture'],
    pace: 'balanced',
  },
];
