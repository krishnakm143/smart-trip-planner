import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../../src/config/db.js';

let mongod;

export async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

export async function clearTestDb() {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
}

export async function stopTestDb() {
  await disconnectDb();
  await mongod.stop();
}
