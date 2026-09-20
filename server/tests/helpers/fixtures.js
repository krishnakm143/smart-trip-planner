import { Activity } from '../../src/models/Activity.js';
import { Destination } from '../../src/models/Destination.js';
import { addDays, todayDateOnly, parseDateOnly } from '../../src/utils/time.js';

const tier = (stay, food, transport) => ({ stay, food, transport });

const destinationData = {
  manali: {
    name: 'Manali',
    slug: 'manali',
    state: 'Himachal Pradesh',
    category: 'hill-station',
    tagline: 'Snow peaks and cedar forests',
    description: 'A Himalayan resort town on the Beas river.',
    heroImage: '/images/destinations/manali.jpg',
    location: { lat: 32.2432, lng: 77.1892 },
    bestSeason: 'March – June',
    idealDays: { min: 3, max: 5 },
    dailyCost: {
      economy: tier(1200, 500, 400),
      standard: tier(3000, 900, 900),
      luxury: tier(8500, 2000, 2200),
    },
    rating: 4.6,
    tags: ['mountains', 'snow'],
  },
  goa: {
    name: 'Goa',
    slug: 'goa',
    state: 'Goa',
    category: 'beach',
    tagline: 'Beaches and Portuguese quarters',
    description: 'A coastal state known for its beaches and churches.',
    heroImage: '/images/destinations/goa.jpg',
    location: { lat: 15.4909, lng: 73.8278 },
    bestSeason: 'November – February',
    idealDays: { min: 3, max: 6 },
    dailyCost: {
      economy: tier(1500, 600, 500),
      standard: tier(4000, 1200, 1000),
      luxury: tier(12000, 2800, 2500),
    },
    rating: 4.5,
    tags: ['beach', 'seafood'],
  },
};

const activity = (name, type, lat, lng, durationHours, entryFee, rating, bestTime = 'any') => ({
  name,
  type,
  description: `${name} test activity.`,
  location: { lat, lng },
  durationHours,
  entryFee,
  rating,
  bestTime,
});

export const manaliActivities = [
  activity('Hadimba Devi Temple', 'spiritual', 32.2483, 77.1806, 1, 0, 4.6, 'morning'),
  activity('Solang Valley', 'adventure', 32.3166, 77.157, 4, 700, 4.5, 'morning'),
  activity('Rohtang Pass', 'adventure', 32.3716, 77.2466, 5, 550, 4.7, 'morning'),
  activity('Jogini Waterfall Trek', 'nature', 32.2716, 77.1922, 3, 0, 4.6, 'morning'),
  activity('Vashisht Hot Springs', 'spiritual', 32.2639, 77.1886, 1.5, 0, 4.3),
  activity('Naggar Castle', 'culture', 32.1118, 77.1646, 2, 30, 4.3),
  activity('Old Manali Cafes', 'food', 32.2548, 77.176, 2, 0, 4.4, 'evening'),
  activity('Mall Road Manali', 'shopping', 32.2433, 77.189, 1.5, 0, 4.2, 'evening'),
];

export async function seedDestination(key = 'manali') {
  const destination = await Destination.create(destinationData[key]);
  if (key === 'manali') {
    await Activity.insertMany(
      manaliActivities.map((item) => ({ ...item, destination: destination.id })),
    );
  }
  return destination;
}

export const dateFromToday = (offsetDays) =>
  addDays(parseDateOnly(todayDateOnly()), offsetDays).toISOString().slice(0, 10);

export const planInput = (destinationId, overrides = {}) => ({
  destinationId,
  startDate: dateFromToday(7),
  endDate: dateFromToday(10),
  travelers: 2,
  budgetTier: 'standard',
  interests: ['adventure', 'nature'],
  pace: 'balanced',
  ...overrides,
});

export async function registerUser(request, overrides = {}) {
  const response = await request.post('/api/v1/auth/register').send({
    name: 'Asha Patel',
    email: 'asha@example.com',
    password: 'Password@123',
    ...overrides,
  });
  return response.body.data;
}
