import { connectDb, disconnectDb } from '../config/db.js';
import { config } from '../config/env.js';
import { Activity } from '../models/Activity.js';
import { Destination } from '../models/Destination.js';
import { Trip } from '../models/Trip.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/authService.js';
import { createTrip, defaultTitle } from '../services/tripService.js';
import { activitiesBySlug } from './activities.js';
import { destinations } from './destinations.js';
import { SAMPLE_PASSWORD, sampleTrips, sampleUsers } from './sampleData.js';

const upsertOptions = {
  upsert: true,
  returnDocument: 'after',
  runValidators: true,
  setDefaultsOnInsert: true,
};

async function seedDestinations() {
  let activityCount = 0;

  for (const data of destinations) {
    const destination = await Destination.findOneAndUpdate(
      { slug: data.slug },
      data,
      upsertOptions,
    );

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

async function seedUsers() {
  for (const { name, email } of sampleUsers) {
    const passwordHash = await hashPassword(SAMPLE_PASSWORD);
    await User.findOneAndUpdate({ email }, { name, email, passwordHash }, upsertOptions);
  }
}

const dateInDays = (count) => {
  const date = new Date();
  date.setDate(date.getDate() + count);
  return date.toLocaleDateString('en-CA');
};

// A sample trip is recognised by owner and title, so re-running the seed does not duplicate it.
async function seedTrips() {
  let created = 0;

  for (const { email, slug, startInDays, days, ...plan } of sampleTrips) {
    const user = await User.findOne({ email });
    const destination = await Destination.findOne({ slug });
    const title = defaultTitle(days, destination.name);
    if (await Trip.exists({ user: user.id, title })) continue;

    await createTrip(user.id, {
      ...plan,
      title,
      destinationId: destination.id,
      startDate: dateInDays(startInDays),
      endDate: dateInDays(startInDays + days - 1),
    });
    created += 1;
  }

  return created;
}

async function run() {
  await connectDb(config.mongodbUri);
  await Promise.all([User.init(), Destination.init(), Activity.init(), Trip.init()]);

  const activityCount = await seedDestinations();
  await seedUsers();
  const tripCount = await seedTrips();

  console.log(`Seeded ${destinations.length} destinations and ${activityCount} activities.`);
  console.log(`Seeded ${sampleUsers.length} users and ${tripCount} new sample trips.`);
  console.log(`Demo login: ${sampleUsers[0].email} / ${SAMPLE_PASSWORD}`);
}

run()
  .catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
