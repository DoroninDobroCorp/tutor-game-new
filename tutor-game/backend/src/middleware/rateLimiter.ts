import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { isRateLimited } from '../utils/security';
import { sendRateLimitExceeded } from '../utils/response';

/**
 * Rate limiting middleware
 * @param windowMs Time window in milliseconds
 * @param max Maximum number of requests allowed in the time window
 */
export const rateLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for certain paths (e.g., health checks)
    if (req.path === '/health') {
      return next();
    }

    // Use IP address as the rate limit key
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rate-limit:${ip}:${req.method}:${req.path}`;

    // Check if rate limit is exceeded
    if (isRateLimited(key, windowMs, max)) {
      return sendRateLimitExceeded(
        res,
        'Too many requests, please try again later.'
      );
    }

    next();
  };
};

// Default rate limiter (15 minutes window, 100 requests)
export const defaultRateLimiter = rateLimiter();

// Strict rate limiter (1 minute window, 10 requests)
export const strictRateLimiter = rateLimiter(60 * 1000, 10);

// Login-specific rate limiter (15 minutes window, 5 requests)
export const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Use IP + email for login attempts to prevent brute force
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const email = req.body.email || 'unknown';
  const key = `login:${ip}:${email}`;
  
  // 5 attempts per 15 minutes
  if (isRateLimited(key, 15 * 60 * 1000, 5)) {
    return sendRateLimitExceeded(
      res,
      'Too many login attempts. Please try again later.'
    );
  }
  
  next();
};

// API key rate limiter (1 hour window, 1000 requests)
export const apiKeyRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    return next();
  }
  
  const key = `api-key:${apiKey}`;
  
  // 1000 requests per hour per API key
  if (isRateLimited(key, 60 * 60 * 1000, 1000)) {
    return sendRateLimitExceeded(
      res,
      'API rate limit exceeded. Please try again later.'
    );
  }
  
  next();
};
