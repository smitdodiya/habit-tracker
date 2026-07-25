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
      /**
       * Three kinds of caller now reach this API, and a single fixed origin
       * locks two of them out:
       *
       *   The web app          a real browser origin (the Vite dev server, or
       *                        the deployed site).
       *   The native app       React Native sends no Origin header at all, so
       *                        `origin` arrives undefined and must be allowed —
       *                        CORS is a browser policy and simply does not
       *                        apply to it.
       *   Expo's web preview   a different localhost port, used for development
       *                        and automated checks.
       *
       * Development additionally allows any localhost port and any ngrok
       * tunnel, so the app can be opened on a real phone without editing
       * config. Production narrows to the configured origin only.
       */
      origin(origin, callback) {
        if (!origin) return callback(null, true); // native app / curl
        if (origin === env.clientOrigin) return callback(null, true);

        if (!env.isProduction) {
          const allowed =
            /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
            /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
            /\.ngrok(-free)?\.(app|dev|io)$/.test(new URL(origin).hostname);
          if (allowed) return callback(null, true);
        }

        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
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
