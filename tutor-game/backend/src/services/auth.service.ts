import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, Role, Prisma } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

// Define a user type without the password
interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  lastActive: Date | null;
  createdAt: Date;
}
import { logger } from '../utils/logger';

type PrismaType = typeof Prisma;
import { config } from '../config/env';
import { Request } from 'express';

const prisma = new PrismaClient() as PrismaClient & {
  tokenBlacklist: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
  };
};

// Type assertion to avoid TypeScript errors
(prisma as any).tokenBlacklist = prisma['tokenBlacklist'];

// Token payload interface
interface TokenPayload {
  userId: string;
  role: Role;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  jti?: string; // JWT ID for blacklisting
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Track login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Cleanup expired blacklisted tokens periodically
setInterval(async () => {
  try {
    const result = await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired blacklisted tokens`);
    }
  } catch (error) {
    logger.error('Error cleaning up expired blacklisted tokens:', error);
  }
}, 3600000); // Run every hour

export const register = async (
  email: string,
  password: string,
  role: Role,
  name: string,
): Promise<AuthResponse> => {
  logger.info(`Registration attempt for email: ${email}, role: ${role}`);
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn(`Invalid email format: ${email}`);
    throw new AppError('Invalid email format', 400);
  }

  // Validate password strength (simplified)
  if (password.length < 4) {
    throw new AppError('Password must be at least 4 characters long', 400);
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      logger.warn(`Registration failed - user already exists: ${email}`);
      throw new AppError('User with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user data with all required fields
      const [firstName, ...lastNameParts] = name.split(' ');
      
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          firstName,
          lastName: lastNameParts.length > 0 ? lastNameParts.join(' ') : null,
          lastActive: new Date()
        },
      });

      // Create corresponding profile based on role
      if (role === 'TEACHER') {
        await tx.teacher.create({
          data: { 
            userId: user.id,
            // Add any required fields for teacher
          },
        });
      } else {
        // For students, create a student record without a teacher initially
        // The teacher can be assigned later
        await tx.student.create({
          data: {
            userId: user.id,
            // No need to set teacherId as it's now optional
          },
        });
      }

      return user;
    });

    logger.info(`User registered successfully: ${result.id}`);
    return await generateTokens(result);
  } catch (error) {
    logger.error('Registration error:', error);
    throw new AppError('Failed to register user', 500);
  }
};

export const login = async (email: string, password: string, ipAddress: string): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> => {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  
  logger.info(`Login attempt for email: ${email} from IP: ${ipAddress}`);
  
  // Check rate limiting
  const now = Date.now();
  const attempt = loginAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 };
  
  if (attempt.count >= MAX_ATTEMPTS) {
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_DURATION) {
      const timeLeft = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
      throw new AppError(`Too many login attempts. Please try again in ${timeLeft} minutes.`, 429);
    } else {
      // Reset attempt count if lockout period has passed
      loginAttempts.delete(ipAddress);
    }
  }

  // Find user with password
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { teacher: true, student: true },
  });
  
  if (!user) {
    // Track failed attempt
    loginAttempts.set(ipAddress, {
      count: (loginAttempts.get(ipAddress)?.count || 0) + 1,
      lastAttempt: now
    });
    
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    // Track failed attempt
    loginAttempts.set(ipAddress, {
      count: (loginAttempts.get(ipAddress)?.count || 0) + 1,
      lastAttempt: now
    });
    
    throw new AppError('Invalid email or password', 401);
  }
  
  // Reset login attempts on successful login
  loginAttempts.delete(ipAddress);

  // Generate and return tokens
  return await generateTokens(user);
};

export const getCurrentUser = async (userId: string): Promise<SafeUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) return null;
  
  const { password, ...userData } = user;
  return userData as SafeUser;
};

export const generateToken = (user: User, type: 'access' | 'refresh' = 'access'): string => {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = type === 'access' ? '15m' : '7d';
  
  const payload: Omit<TokenPayload, 'exp' | 'iat'> = {
    userId: user.id,
    role: user.role,
    type,
  };

  return jwt.sign(
    payload,
    config.jwtSecret,
    { 
      expiresIn,
    }
  );
};

interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = async (user: User): Promise<AuthResponse> => {
  const accessToken = generateToken(user, 'access');
  const refreshToken = generateToken(user, 'refresh');

  // Get fresh user data to ensure we have all fields
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!currentUser) {
    throw new AppError('User not found', 404);
  }

  const { password: _, ...userData } = currentUser;
  
  return {
    user: userData as SafeUser,
    accessToken,
    refreshToken
  };
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const blacklistedToken = await prisma.tokenBlacklist.findUnique({
    where: { token },
  } as any);
  return !!blacklistedToken;
};

export const blacklistToken = async (token: string, expiresAt: Date): Promise<void> => {
  await prisma.tokenBlacklist.create({
    data: {
      token,
      expiresAt,
    },
  } as any);

  // Clean up expired tokens in the background
  await prisma.tokenBlacklist.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  } as any);
};

export const verifyToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return null;
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const refreshTokens = async (refreshToken: string): Promise<AuthResponse> => {
  // Verify refresh token
  const decoded = await verifyToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') {
    throw new AppError('Invalid refresh token', 401);
  }
  
  // Blacklist the used refresh token
  await blacklistToken(
    refreshToken, 
    new Date(decoded.exp! * 1000) // Use token expiration time
  );

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { teacher: true, student: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new tokens
  return generateTokens(user);
};
