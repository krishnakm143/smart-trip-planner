import mongoose from 'mongoose';

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

export const disconnectDb = () => mongoose.disconnect();

export const isDbConnected = () => mongoose.connection.readyState === 1;
