import { ApiError } from '../utils/ApiError.js';

/**
 * Validates `req[source]` against a zod schema, replacing it with the parsed
 * result so controllers receive coerced, trimmed, defaulted values and never
 * have to re-check shapes.
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    // req.query is a getter on Express 5+; assigning to a local copy keeps
    // this middleware safe across versions.
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;

    next();
  };
