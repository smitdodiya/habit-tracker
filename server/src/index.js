import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { startReminderScheduler } from './services/reminder.service.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function start() {
  // Connect before listening so a bad connection string fails immediately
  // rather than surfacing as mysterious timeouts on the first request.
  await connectDatabase();

  const app = createApp();
  const reminderTask = startReminderScheduler();

  const server = app.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);
    reminderTask?.stop();
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
});
