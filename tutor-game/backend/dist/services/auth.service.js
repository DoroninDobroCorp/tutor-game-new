"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokens = exports.verifyToken = exports.blacklistToken = exports.isTokenBlacklisted = exports.generateTokens = exports.generateToken = exports.getCurrentUser = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middlewares/error.middleware");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
const prisma = new client_1.PrismaClient();
// Type assertion to avoid TypeScript errors
prisma.tokenBlacklist = prisma['tokenBlacklist'];
// Track login attempts
const loginAttempts = new Map();
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
            logger_1.logger.info(`Cleaned up ${result.count} expired blacklisted tokens`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error cleaning up expired blacklisted tokens:', error);
    }
}, 3600000); // Run every hour
const register = async (email, password, role, name) => {
    logger_1.logger.info(`Registration attempt for email: ${email}, role: ${role}`);
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        logger_1.logger.warn(`Invalid email format: ${email}`);
        throw new error_middleware_1.AppError('Invalid email format', 400);
    }
    // Validate password strength (simplified)
    if (password.length < 4) {
        throw new error_middleware_1.AppError('Password must be at least 4 characters long', 400);
    }
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            logger_1.logger.warn(`Registration failed - user already exists: ${email}`);
            throw new error_middleware_1.AppError('User with this email already exists', 400);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
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
            }
            else {
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
        logger_1.logger.info(`User registered successfully: ${result.id}`);
        return await (0, exports.generateTokens)(result);
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        throw new error_middleware_1.AppError('Failed to register user', 500);
    }
};
exports.register = register;
const login = async (email, password, ipAddress) => {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    logger_1.logger.info(`Login attempt for email: ${email} from IP: ${ipAddress}`);
    // Check rate limiting
    const now = Date.now();
    const attempt = loginAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 };
    if (attempt.count >= MAX_ATTEMPTS) {
        const timeSinceLastAttempt = now - attempt.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_DURATION) {
            const timeLeft = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
            throw new error_middleware_1.AppError(`Too many login attempts. Please try again in ${timeLeft} minutes.`, 429);
        }
        else {
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
        throw new error_middleware_1.AppError('Invalid email or password', 401);
    }
    // Check password
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        // Track failed attempt
        loginAttempts.set(ipAddress, {
            count: (loginAttempts.get(ipAddress)?.count || 0) + 1,
            lastAttempt: now
        });
        throw new error_middleware_1.AppError('Invalid email or password', 401);
    }
    // Reset login attempts on successful login
    loginAttempts.delete(ipAddress);
    // Generate and return tokens
    return await (0, exports.generateTokens)(user);
};
exports.login = login;
const getCurrentUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user)
        return null;
    const { password, ...userData } = user;
    return userData;
};
exports.getCurrentUser = getCurrentUser;
const generateToken = (user, type = 'access') => {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = type === 'access' ? '15m' : '7d';
    const payload = {
        userId: user.id,
        role: user.role,
        type,
    };
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, {
        expiresIn,
    });
};
exports.generateToken = generateToken;
const generateTokens = async (user) => {
    const accessToken = (0, exports.generateToken)(user, 'access');
    const refreshToken = (0, exports.generateToken)(user, 'refresh');
    // Get fresh user data to ensure we have all fields
    const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
    });
    if (!currentUser) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const { password: _, ...userData } = currentUser;
    return {
        user: userData,
        accessToken,
        refreshToken
    };
};
exports.generateTokens = generateTokens;
const isTokenBlacklisted = async (token) => {
    const hashedToken = await bcryptjs_1.default.hash(token, 10);
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
        where: { token: hashedToken },
    });
    return !!blacklistedToken;
};
exports.isTokenBlacklisted = isTokenBlacklisted;
const blacklistToken = async (token, expiresAt) => {
    const hashedToken = await bcryptjs_1.default.hash(token, 10);
    await prisma.tokenBlacklist.create({
        data: {
            token: hashedToken,
            expiresAt,
        },
    });
    // Clean up expired tokens in the background
    await prisma.tokenBlacklist.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    });
};
exports.blacklistToken = blacklistToken;
const verifyToken = async (token) => {
    try {
        // Check if token is blacklisted
        if (await (0, exports.isTokenBlacklisted)(token)) {
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
const refreshTokens = async (refreshToken) => {
    // Verify refresh token
    const decoded = await (0, exports.verifyToken)(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
        throw new error_middleware_1.AppError('Invalid refresh token', 401);
    }
    // Blacklist the used refresh token
    await (0, exports.blacklistToken)(refreshToken, new Date(decoded.exp * 1000) // Use token expiration time
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
    return (0, exports.generateTokens)(user);
};
exports.refreshTokens = refreshTokens;
