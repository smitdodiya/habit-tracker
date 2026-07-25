import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Terminal 404 handler for unmatched API routes. */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler.
 *
 * Translates the error types we actually produce — ApiError, Mongoose
 * validation and duplicate-key errors — into clean JSON, and refuses to leak
 * internals for anything unexpected.
 */
// The unused `_next` is required: Express identifies error handlers by arity,
// and a three-argument function is treated as ordinary middleware.
export function errorHandler(error, req, res, _next) {
  let statusCode = 500;
  let message = 'Something went wrong';
  let details;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern ?? {}).join(', ');
    message = field ? `That ${field} is already in use` : 'Duplicate entry';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path}`;
  }

  // 5xx means we have a bug; log it with the stack. 4xx is the client's
  // problem and would only add noise.
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} —`, error.stack ?? error.message);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProduction || statusCode < 500 ? {} : { stack: error.stack }),
    },
  });
}
