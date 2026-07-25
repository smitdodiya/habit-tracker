import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Opens the MongoDB connection. Mongoose buffers queries until the connection
 * is ready, so callers do not need to await this before defining models —
 * but the server does await it before listening, to fail fast on a bad URI.
 */
export async function connectDatabase() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', error.message);
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info(`MongoDB connected → ${redactUri(env.mongoUri)}`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

/** Hides credentials so a connection string is safe to print in logs. */
function redactUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}
