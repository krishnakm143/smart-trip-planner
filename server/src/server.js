import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { config } from './config/env.js';
import { providerName } from './providers/index.js';

async function start() {
  await connectDb(config.mongodbUri);

  const server = createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}/api/v1 (${providerName} providers)`);
  });

  const shutdown = () => {
    server.close(async () => {
      await disconnectDb();
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
