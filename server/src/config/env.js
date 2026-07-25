/**
 * Central environment configuration.
 *
 * Every other module imports `env` from here rather than touching process.env
 * directly, so there is exactly one place to look for what is configurable and
 * exactly one place that fails loudly when something required is missing.
 */

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Copy server/.env.example to server/.env and fill it in.`,
    );
  }
  return value;
};

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 5000),

  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  mongoUri: required('MONGODB_URI', 'mongodb://localhost:27017/habit-tracker'),

  // In production we refuse to boot on the placeholder dev secrets; in
  // development we fall back so the app runs with zero setup.
  jwt: {
    accessSecret: isProduction
      ? required('JWT_ACCESS_SECRET')
      : (process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me'),
    refreshSecret: isProduction
      ? required('JWT_REFRESH_SECRET')
      : (process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me'),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  },

  // Web Push is optional: with no keys configured the reminder cron simply
  // skips sending, and the browser falls back to in-page notifications.
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:admin@asensebranding.com',
    get enabled() {
      return Boolean(this.publicKey && this.privateKey);
    },
  },
};
