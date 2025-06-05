import { config } from '../config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rate limiting store (in-memory, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

/**
 * Check if a request is rate limited
 * @param key - The key to rate limit against (e.g., IP, email)
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of attempts allowed in the time window
 */
export const isRateLimited = (key: string, windowMs: number, max: number): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    rateLimitStore.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }

  // Reset the counter if the window has passed
  if (now > entry.expiresAt) {
    rateLimitStore.delete(key);
    return false;
  }

  // Increment the counter and check against max
  entry.count += 1;
  return entry.count > max;
};

/**
 * Clean up expired rate limit entries
 */
const cleanupRateLimits = (): void => {
  const now = Date.now();
  for (const [key, { expiresAt }] of rateLimitStore.entries()) {
    if (now > expiresAt) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

/**
 * Validate password strength
 * @throws {Error} If password doesn't meet requirements
 */
export const validatePassword = (password: string): void => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }
};

/**
 * Validate email format
 * @throws {Error} If email is invalid
 */
export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
};

/**
 * Check if a token is blacklisted
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const blacklisted = await prisma.tokenBlacklist.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    return !!blacklisted;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    // Fail closed - if we can't check the blacklist, assume token is blacklisted
    return true;
  }
};

/**
 * Add a token to the blacklist
 */
export const blacklistToken = async (token: string, expiresAt: Date): Promise<void> => {
  try {
    await prisma.tokenBlacklist.create({
      data: {
        token,
        expiresAt,
      },
    });
    console.log(`Token blacklisted, expires at: ${expiresAt}`);
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw new Error('Failed to blacklist token');
  }
};

/**
 * Clean up expired blacklisted tokens
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const result = await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      console.log(`Cleaned up ${result.count} expired blacklisted tokens`);
    }
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 3600000).unref();

/**
 * Generate a secure random token
 */
export const generateRandomToken = (length = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues, byte => charset[byte % charset.length]).join('');
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
