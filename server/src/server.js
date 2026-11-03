import { createApp } from './app.js';
import { connectDb, disconnectDb, isDbConnected } from './config/db.js';
import { config } from './config/env.js';
import { Destination } from './models/Destination.js';
import { providerName } from './providers/index.js';
import { destinations } from './seed/destinations.js';
import { seedDestinations } from './seed/seed.js';

async function autoSyncCatalog() {
  try {
    const count = await Destination.countDocuments();
    if (count < destinations.length) {
      console.log(`Auto-syncing catalog destinations (${count} -> ${destinations.length})...`);
      await seedDestinations();
      console.log('Catalog auto-sync complete.');
    }
  } catch (err) {
    console.warn('Catalog auto-sync warning:', err.message);
  }
}

async function start() {
  if (config.tripStorage === 'supabase') {
    console.log('Operating with Supabase PostgreSQL database and Supabase Auth');
    if (config.mongodbUri) {
      connectDb(config.mongodbUri)
        .then(async () => {
          console.log('Database connected: MongoDB (catalog cache)');
          await autoSyncCatalog();
        })
        .catch(() => {});
    }
  } else if (config.mongodbUri) {
    await connectDb(config.mongodbUri);
    console.log('Database connected: MongoDB');
    await autoSyncCatalog();
  }

  const server = createApp().listen(config.port, () => {
    console.log(
      `API listening on http://localhost:${config.port}/api/v1 (${providerName} providers, storage: ${config.tripStorage}, auth: ${config.authProvider})`,
    );
  });

  const shutdown = () => {
    server.close(async () => {
      if (isDbConnected()) {
        try {
          await disconnectDb();
        } catch {
          // Ignore disconnection error during process shutdown
        }
      }
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
