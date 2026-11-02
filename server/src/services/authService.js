import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { isDbConnected } from '../config/db.js';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { ApiError } from '../utils/ApiError.js';
import { sendOtpEmail, sendPasswordResetOtpEmail } from './emailService.js';

const BCRYPT_COST = 10;
const memoryOtps = new Map();
const memoryUsers = new Map();

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST);

const signToken = (user) =>
  jwt.sign(
    { sub: user.id || user._id, email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

export const toPublicUser = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

function toSupabaseUser(user) {
  const meta = user.user_metadata || {};
  const rawName = meta.name || meta.full_name || meta.display_name;
  const displayName =
    typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : user.email
      ? user.email.split('@')[0]
      : 'Traveler';
  const role = user.app_metadata?.role === 'admin' ? 'admin' : 'traveler';
  return {
    id: user.id,
    name: displayName,
    email: user.email,
    role,
    createdAt: user.created_at,
  };
}

/**
 * Verifies a bearer token with the authority that issued it. Supabase tokens
 * are checked remotely rather than decoded locally, so a revoked session is
 * not accepted just because its JWT has not expired yet.
 */
export async function authenticateToken(token) {
  // First attempt local JWT decoding
  try {
    const payload = verifyToken(token);
    if (payload && (payload.sub || payload.id)) {
      const userId = payload.sub || payload.id;
      if (isDbConnected()) {
        const user = await User.findById(userId);
        if (user) return toPublicUser(user);
      }
      const memUser = memoryUsers.get(userId) || (payload.email ? memoryUsers.get(payload.email) : null);
      if (memUser) return toPublicUser(memUser);
      return {
        id: userId,
        name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Traveler'),
        email: payload.email || 'traveler@smarttrip.in',
        role: payload.role || 'traveler',
        createdAt: payload.createdAt || new Date().toISOString(),
      };
    }
  } catch {
    // Fall through to remote Supabase verification
  }

  if (config.authProvider === 'supabase' && config.supabaseUrl) {
    let response;
    try {
      response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: config.supabasePublishableKey || config.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw ApiError.unauthorized('Could not verify this session. Please log in again.');
    }

    if (!response.ok) throw ApiError.unauthorized('Your session is invalid or has expired. Please log in again.');
    return toSupabaseUser(await response.json());
  }

  throw ApiError.unauthorized('Your session is invalid or has expired. Please log in again.');
}

export async function register({ name, email, password }) {
  if (config.authProvider === 'supabase') {
    throw ApiError.validation('Create accounts through the configured Supabase client');
  }

  if (isDbConnected()) {
    if (await User.exists({ email })) {
      throw ApiError.conflict('An account with this email already exists');
    }
    const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    return { user: toPublicUser(user), token: signToken(user) };
  }

  if (memoryUsers.has(email)) {
    throw ApiError.conflict('An account with this email already exists');
  }
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const memUser = { id, name, email, passwordHash, role: 'traveler', createdAt: new Date().toISOString() };
  memoryUsers.set(email, memUser);
  memoryUsers.set(id, memUser);
  return { user: toPublicUser(memUser), token: signToken(memUser) };
}

export async function login({ email, password }) {
  if (config.authProvider === 'supabase') {
    throw ApiError.validation('Log in through the configured Supabase client');
  }

  if (isDbConnected()) {
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!passwordMatches) {
      throw ApiError.unauthorized('Incorrect email or password');
    }
    return { user: toPublicUser(user), token: signToken(user) };
  }

  const memUser = memoryUsers.get(email);
  const passwordMatches = memUser ? await bcrypt.compare(password, memUser.passwordHash) : false;
  if (!passwordMatches) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  return { user: toPublicUser(memUser), token: signToken(memUser) };
}

export async function sendOtp(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (isDbConnected()) {
    await Otp.deleteMany({ email });
    await Otp.create({ email, code, expiresAt });
    const existingUser = await User.findOne({ email });
    const userName = existingUser?.name || 'Traveler';
    await sendOtpEmail(email, code, userName);
  } else {
    memoryOtps.set(email, { code, expiresAt });
    const existingUser = memoryUsers.get(email);
    const userName = existingUser?.name || 'Traveler';
    await sendOtpEmail(email, code, userName);
  }

  // Log in server console for development audit
  if (config.isDev) {
    console.warn(`\n📬 [OTP Sent] Email: ${email} | Code: ${code} (Check inbox or Brevo)\n`);
  }

  return {
    message: 'Verification code sent to your email address.',
    ...(config.isDev || config.isTest ? { debugCode: code } : {}),
  };
}

export async function verifyOtp({ email, code }) {
  if (isDbConnected()) {
    const record = await Otp.findOne({ email, code });
    if (!record || record.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired verification code');
    }

    await Otp.deleteMany({ email });

    let user = await User.findOne({ email });
    if (!user) {
      const defaultName = email.split('@')[0];
      const capitalized = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      user = await User.create({
        name: capitalized,
        email,
        role: 'traveler',
      });
    }

    return { user: toPublicUser(user), token: signToken(user) };
  }

  const record = memoryOtps.get(email);
  if (!record || record.code !== code || record.expiresAt < new Date()) {
    throw ApiError.unauthorized('Invalid or expired verification code');
  }

  memoryOtps.delete(email);

  if (config.authProvider === 'supabase' && config.supabaseUrl && config.supabaseServiceRoleKey && !config.isTest) {
    try {
      const linkRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          apikey: config.supabasePublishableKey || config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'magiclink', email }),
      });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData.hashed_token) {
          const verifyRes = await fetch(`${config.supabaseUrl}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              apikey: config.supabasePublishableKey || config.supabaseAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'magiclink',
              token_hash: linkData.hashed_token,
            }),
          });
          if (verifyRes.ok) {
            const session = await verifyRes.json();
            const suUser = toSupabaseUser(session.user);
            memoryUsers.set(email, suUser);
            memoryUsers.set(suUser.id, suUser);
            return {
              user: suUser,
              token: session.access_token,
              refreshToken: session.refresh_token,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase Sync] Warning during OTP session exchange:', err.message);
    }
  }

  let memUser = memoryUsers.get(email);
  if (!memUser) {
    const defaultName = email.split('@')[0];
    let resolvedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    if (config.supabaseUrl && config.supabaseServiceRoleKey && !config.isTest) {
      try {
        const uRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
          headers: {
            apikey: config.supabaseServiceRoleKey,
            Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          },
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          const found = uData.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          const suName = found?.user_metadata?.name || found?.user_metadata?.full_name;
          if (suName) resolvedName = suName;
        }
      } catch {
        // Fallback to email capitalized
      }
    }

    const id = crypto.randomUUID();
    memUser = { id, name: resolvedName, email, role: 'traveler', createdAt: new Date().toISOString() };
    memoryUsers.set(email, memUser);
    memoryUsers.set(id, memUser);
  }

  return { user: toPublicUser(memUser), token: signToken(memUser) };
}

export async function sendPasswordResetOtp(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  let userName = 'Traveler';

  if (isDbConnected()) {
    const existingUser = await User.findOne({ email });
    if (!existingUser && config.authProvider === 'local') {
      throw ApiError.notFound('No registered account was found with this email address. Please check your spelling or create an account.');
    }
    if (existingUser?.name) userName = existingUser.name;
    await Otp.deleteMany({ email });
    await Otp.create({ email, code, expiresAt });
  } else {
    const existingUser = memoryUsers.get(email);
    if (!existingUser && config.authProvider === 'local' && memoryUsers.size > 0) {
      throw ApiError.notFound('No registered account was found with this email address. Please check your spelling or create an account.');
    }
    if (existingUser?.name) userName = existingUser.name;
    memoryOtps.set(email, { code, expiresAt });
  }

  // If Supabase is configured, attempt to resolve traveler name for personalized email
  if (config.supabaseUrl && config.supabaseServiceRoleKey && !config.isTest) {
    try {
      const res = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
        headers: {
          apikey: config.supabaseServiceRoleKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const su = data.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (su) {
          const suName = su?.user_metadata?.name || su?.user_metadata?.full_name;
          if (suName) userName = suName;
        } else if (config.authProvider === 'supabase') {
          throw ApiError.notFound('No registered account was found with this email address. Please check your spelling or create an account.');
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Keep existing userName fallback
    }
  }

  await sendPasswordResetOtpEmail(email, code, userName);

  if (config.isDev) {
    console.warn(`\n🔑 [Password Reset OTP Sent] Email: ${email} | Code: ${code} (Check inbox or Brevo)\n`);
  }

  return {
    message: 'Verification code sent to your email address.',
    ...(config.isDev || config.isTest ? { debugCode: code } : {}),
  };
}

export async function resetPassword({ email, code, newPassword }) {
  if (isDbConnected()) {
    const record = await Otp.findOne({ email, code });
    if (!record || record.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired verification code');
    }
    await Otp.deleteMany({ email });
  } else {
    const record = memoryOtps.get(email);
    if (!record || record.code !== code || record.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired verification code');
    }
    memoryOtps.delete(email);
  }

  let updated = false;

  // 1. If Supabase is configured with service role key, update Supabase user password
  if (config.supabaseUrl && config.supabaseServiceRoleKey && !config.isTest) {
    try {
      const res = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
        headers: {
          apikey: config.supabaseServiceRoleKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const su = data.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (su) {
          const updateRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${su.id}`, {
            method: 'PUT',
            headers: {
              apikey: config.supabaseServiceRoleKey,
              Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: newPassword }),
          });
          if (updateRes.ok) {
            updated = true;
          } else {
            const errData = await updateRes.json().catch(() => ({}));
            console.warn('[AuthService] Supabase password update warning:', errData);
          }
        }
      }
    } catch (err) {
      console.warn('[AuthService] Supabase password update error:', err.message);
    }
  }

  // 2. Also update in MongoDB if connected
  if (isDbConnected()) {
    const user = await User.findOne({ email });
    if (user) {
      user.passwordHash = await hashPassword(newPassword);
      await user.save();
      updated = true;
    }
  }

  // 3. Also update in memory store if present
  const memUser = memoryUsers.get(email);
  if (memUser) {
    memUser.passwordHash = await hashPassword(newPassword);
    updated = true;
  }

  if (!updated && (isDbConnected() || memoryUsers.size > 0 || (config.supabaseUrl && config.supabaseServiceRoleKey && !config.isTest))) {
    throw ApiError.notFound('No registered account was found with this email address. Please register for an account.');
  }

  return {
    success: true,
    message: 'Your password has been reset successfully. You can now log in with your new password.',
  };
}
