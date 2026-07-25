import { User } from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { isValidTimezone } from '../utils/date.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
} from '../middleware/auth.js';

/** POST /api/auth/signup */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, timezone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = new User({
    name,
    email,
    timezone: isValidTimezone(timezone) ? timezone : 'UTC',
  });
  await user.setPassword(password);
  await user.save();

  const refreshToken = issueSession(req, res, user);
  res.status(201).json({ user: user.toPublicJSON(), accessToken: signAccessToken(user), refreshToken });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // passwordHash is `select: false`, so it must be requested explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');

  // One message for both "no such user" and "wrong password" — telling them
  // apart would let anyone enumerate which emails have accounts.
  const invalid = ApiError.unauthorized('Incorrect email or password');
  if (!user) throw invalid;
  if (!(await user.verifyPassword(password))) throw invalid;

  user.lastActiveAt = new Date();
  await user.save();

  const refreshToken = issueSession(req, res, user);
  res.json({ user: user.toPublicJSON(), accessToken: signAccessToken(user), refreshToken });
});

/**
 * POST /api/auth/refresh
 * Trades the httpOnly refresh cookie for a new access token, so a page reload
 * restores the session without the user logging in again.
 */
export const refresh = asyncHandler(async (req, res) => {
  // Cookie for browsers, body for the mobile app — see issueSession below.
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Refresh token expired or invalid');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  // Rotate the refresh token on every use, so a stolen one has a short life.
  const refreshToken = issueSession(req, res, user);
  res.json({ user: user.toPublicJSON(), accessToken: signAccessToken(user), refreshToken });
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: undefined });
  res.json({ success: true });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

/** PATCH /api/auth/me */
export const updateProfile = asyncHandler(async (req, res) => {
  const { timezone, ...rest } = req.body;

  if (timezone !== undefined) {
    if (!isValidTimezone(timezone)) throw ApiError.badRequest('Unrecognised timezone');
    req.user.timezone = timezone;
  }
  Object.assign(req.user, rest);

  await req.user.save();
  res.json({ user: req.user.toPublicJSON() });
});

/** POST /api/auth/change-password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.verifyPassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  await user.setPassword(newPassword);
  await user.save();

  res.json({ success: true });
});

/**
 * Issues the rotating refresh token.
 *
 * Two clients, two transports. A browser gets an httpOnly cookie, which
 * JavaScript cannot read and therefore an injected script cannot steal.
 * React Native has no cookie jar at all, so a mobile client (identified by the
 * `X-Client: mobile` header) gets the token in the response body and stores it
 * in expo-secure-store — the iOS Keychain / Android Keystore. That is the
 * platform's equivalent of httpOnly, not a weaker substitute for it.
 *
 * The cookie is still set either way; it simply goes unused on mobile.
 *
 * @returns {string|undefined} the token, when the caller should return it in the body
 */
function issueSession(req, res, user) {
  const token = signRefreshToken(user);
  res.cookie('refreshToken', token, refreshCookieOptions());
  return isMobileClient(req) ? token : undefined;
}

/** True when the request comes from the React Native app rather than a browser. */
export function isMobileClient(req) {
  return String(req.headers['x-client'] ?? '').toLowerCase() === 'mobile';
}
