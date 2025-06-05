import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { 
  register, 
  login, 
  getCurrentUser, 
  refreshTokens, 
  blacklistToken 
} from '../services/auth.service';
import { AppError } from '../middlewares/error.middleware';
import { config } from '../config/env';

// Simple password validation
const validatePassword = (password: string) => {
  if (password.length < 4) {
    throw new AppError('Password must be at least 4 characters long', 400);
  }
};

export const registerHandler = async (req: Request, res: Response) => {
  console.log('Registration request received');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    let { email, password, role, firstName, lastName } = req.body;
    
    // If firstName and lastName are not provided, generate defaults
    if (!firstName || !lastName) {
      console.log('Name fields not provided, generating defaults');
      // Use first part of email as first name
      firstName = email.split('@')[0] || 'User';
      // Use role as last name
      lastName = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }
    
    // Validate required fields
    if (!email || !password || !role) {
      throw new AppError('Email, password, and role are required', 400);
    }
    
    const name = `${firstName} ${lastName}`.trim();
    console.log('Processing registration for:', { email, role, name, firstName, lastName });

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Validate role
    if (!['TEACHER', 'STUDENT'].includes(role)) {
      throw new AppError('Invalid role. Must be TEACHER or STUDENT', 400);
    }

    // Validate password
    validatePassword(password);

    console.log('Attempting to register user:', { email, role, name });
    const { user, accessToken, refreshToken } = await register(email, password, role as 'TEACHER' | 'STUDENT', name);
    console.log('User registered successfully:', user.id);

    // Format response to match frontend expectations
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role.toLowerCase() as 'student' | 'teacher',
          avatar: undefined,
        },
        accessToken,
        refreshToken,
      },
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    throw error; // Let the error middleware handle it
  }
};

// Rate limiting store for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_TIMEOUT_MINUTES = 15;

export const loginHandler = async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  console.log(`Login attempt from IP: ${ip}`);
  
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Check rate limiting
  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS) {
    const timeLeft = Math.ceil(
      (new Date().getTime() - attempt.lastAttempt.getTime()) / (1000 * 60)
    );
    
    if (timeLeft < LOGIN_TIMEOUT_MINUTES) {
      throw new AppError(
        `Too many login attempts. Please try again in ${LOGIN_TIMEOUT_MINUTES - timeLeft} minutes.`,
        429
      );
    } else {
      loginAttempts.delete(ip);
    }
  }

  try {
    console.log(`Attempting to log in user: ${email}`);
    const { user, accessToken, refreshToken } = await login(email, password, ip);
    
    // Reset login attempts on successful login
    loginAttempts.delete(ip);
    
    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    console.log(`Login successful for user: ${user.id}`);
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        // Don't send refresh token in response body - it's in the cookie
      },
    });
  } catch (error: any) {
    // Increment failed login attempts
    const attempts = (loginAttempts.get(ip)?.count || 0) + 1;
    loginAttempts.set(ip, { count: attempts, lastAttempt: new Date() });
    
    console.error(`Login failed for IP ${ip}:`, error.message);
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new AppError(
        `Too many failed attempts. Please try again in ${LOGIN_TIMEOUT_MINUTES} minutes.`,
        429
      );
    }
    
    throw new AppError('Invalid email or password', 401);
  }
};

export const getMeHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await getCurrentUser(req.user.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user,
  });
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // Add the current access token to blacklist
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { exp: number };
        await blacklistToken(token, new Date(decoded.exp * 1000));
      } catch (error) {
        console.error('Error blacklisting token:', error);
      }
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
    });
    
    // Set security headers
    res.setHeader('Clear-Site-Data', '"cookies", "storage"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
};

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Try to get refresh token from cookies first, then from body
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(refreshToken);
    
    // Set new refresh token in HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });
    
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    res.json({
      success: true,
      data: {
        accessToken,
        // Don't send new refresh token in response body - it's in the cookie
      },
    });
  } catch (error) {
    // Clear the invalid refresh token cookie
    res.clearCookie('refreshToken', {
      path: '/api/auth/refresh',
    });
    
    console.error('Refresh token error:', error);
    throw new AppError('Invalid or expired refresh token', 401);
  }
};
