import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const ACCESS_TOKEN_TYPE = 'access';
export const REFRESH_TOKEN_TYPE = 'refresh';

/** Short-lived token the client keeps in memory and sends as a Bearer header. */
export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, type: ACCESS_TOKEN_TYPE }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  });
}

/** Long-lived token stored in an httpOnly cookie, unreadable to JavaScript. */
export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: REFRESH_TOKEN_TYPE }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  });
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwt.refreshSecret);
  if (payload.type !== REFRESH_TOKEN_TYPE) throw new Error('Wrong token type');
  return payload;
}

/**
 * Requires a valid access token and attaches the user document to `req.user`.
 *
 * The user is loaded fresh on every request rather than trusted from the token
 * body, so a role change or deletion takes effect immediately instead of
 * lingering until the token expires.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Missing access token');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (error) {
    throw ApiError.unauthorized(
      error.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token',
    );
  }

  if (payload.type !== ACCESS_TOKEN_TYPE) throw ApiError.unauthorized('Invalid access token');

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  req.user = user;
  next();
});

/** Gate for the admin panel routes. Must run after requireAuth. */
export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(ApiError.forbidden('Admin access required'));
  next();
};

/** Cookie options for the refresh token. */
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
