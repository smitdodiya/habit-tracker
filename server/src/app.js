import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Behind Vercel/any proxy, so secure cookies and req.ip resolve correctly.
  app.set('trust proxy', 1);

  /**
   * Express adds an ETag to every JSON response by default, which makes a
   * repeated GET answer 304 Not Modified with an empty body. For an API that
   * is consumed by `await api.get(...)` that is actively harmful: the client
   * destructures an empty response and silently gets `undefined` for every
   * field, with no error to notice. It is also wrong on the merits — these
   * responses are per-user and change the moment anything is checked in.
   *
   * Disabling the ETag and marking API responses no-store keeps every read
   * truthful, and keeps personal habit data out of the browser's disk cache.
   */
  app.set('etag', false);
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      // Required for the httpOnly refresh cookie to travel cross-origin
      // between the Vite dev server and the API.
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  if (!env.isProduction) app.use(morgan('dev'));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
