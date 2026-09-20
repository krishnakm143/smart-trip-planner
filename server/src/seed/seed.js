import { connectDb, disconnectDb } from '../config/db.js';
import { config } from '../config/env.js';
import { Activity } from '../models/Activity.js';
import { Destination } from '../models/Destination.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/authService.js';
import { activitiesBySlug } from './activities.js';
import { destinations } from './destinations.js';

const DEMO_USER = { name: 'Demo Traveller', email: 'demo@smarttrip.in', password: 'Demo@1234' };

const upsertOptions = { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true };

async function seedDestinations() {
  let activityCount = 0;

  for (const data of destinations) {
    const destination = await Destination.findOneAndUpdate({ slug: data.slug }, data, upsertOptions);

    for (const activity of activitiesBySlug[data.slug]) {
      await Activity.findOneAndUpdate(
        { destination: destination.id, name: activity.name },
        { ...activity, destination: destination.id, source: 'seed' },
        upsertOptions,
      );
      activityCount += 1;
    }
  }

  return activityCount;
}

async function seedDemoUser() {
  const { name, email, password } = DEMO_USER;
  await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash: await hashPassword(password) },
    upsertOptions,
  );
}

async function run() {
  await connectDb(config.mongodbUri);
  await Promise.all([User.init(), Destination.init(), Activity.init(), Trip.init()]);

  const activityCount = await seedDestinations();
  await seedDemoUser();

  console.log(`Seeded ${destinations.length} destinations and ${activityCount} activities.`);
  console.log(`Demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

run()
  .catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
