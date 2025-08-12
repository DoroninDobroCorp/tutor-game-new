"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokens = exports.verifyAccessToken = exports.blacklistToken = exports.getCurrentUser = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
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
const register = async (email, password, role, firstName, lastName) => {
    const lowercasedEmail = email.toLowerCase();
    logger_1.logger.info(`Registration attempt for email: ${lowercasedEmail}, role: ${role}`);
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowercasedEmail)) {
        logger_1.logger.warn(`Invalid email format: ${lowercasedEmail}`);
        throw new errors_1.AppError('Invalid email format', 400);
    }
    // Validate password strength (simplified)
    if (password.length < 4) {
        throw new errors_1.AppError('Password must be at least 4 characters long', 400);
    }
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: lowercasedEmail },
            select: { id: true },
        });
        if (existingUser) {
            logger_1.logger.warn(`Registration failed - user already exists: ${lowercasedEmail}`);
            throw new errors_1.AppError('User with this email already exists', 400);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.user.create({
                data: {
                    email: lowercasedEmail,
                    password: hashedPassword,
                    role,
                    firstName,
                    lastName: lastName || null,
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
        return await generateTokens(result);
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        throw new errors_1.AppError('Failed to register user', 500);
    }
};
exports.register = register;
const login = async (email, password, ipAddress) => {
    const lowercasedEmail = email.toLowerCase();
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    logger_1.logger.info(`Login attempt for email: ${lowercasedEmail} from IP: ${ipAddress}`);
    // Check rate limiting
    const now = Date.now();
    const attempt = loginAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 };
    if (attempt.count >= MAX_ATTEMPTS) {
        const timeSinceLastAttempt = now - attempt.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_DURATION) {
            const timeLeft = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
            throw new errors_1.AppError(`Too many login attempts. Please try again in ${timeLeft} minutes.`, 429);
        }
        else {
            // Reset attempt count if lockout period has passed
            loginAttempts.delete(ipAddress);
        }
    }
    // Find user with password
    const user = await prisma.user.findUnique({
        where: { email: lowercasedEmail },
        include: { teacher: true, student: true },
    });
    if (!user) {
        // Track failed attempt
        loginAttempts.set(ipAddress, {
            count: (loginAttempts.get(ipAddress)?.count || 0) + 1,
            lastAttempt: now
        });
        throw new errors_1.AppError('Invalid email or password', 401);
    }
    // Check password
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        // Track failed attempt
        loginAttempts.set(ipAddress, {
            count: (loginAttempts.get(ipAddress)?.count || 0) + 1,
            lastAttempt: now
        });
        throw new errors_1.AppError('Invalid email or password', 401);
    }
    // Reset login attempts on successful login
    loginAttempts.delete(ipAddress);
    // Generate and return tokens
    return await generateTokens(user);
};
exports.login = login;
const getCurrentUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user)
        return null;
    const { password, ...safeUser } = user;
    return safeUser;
};
exports.getCurrentUser = getCurrentUser;
// Generate token helper function
const generateToken = (user, type) => {
    const secret = (type === 'access' ? env_1.config.jwtSecret : env_1.config.jwtRefreshSecret);
    const expiresIn = (type === 'access' ? env_1.config.jwtExpiresIn : env_1.config.refreshTokenExpiresIn);
    const payload = {
        userId: user.id,
        role: user.role,
        type,
    };
    const options = { expiresIn };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
// Generate both access and refresh tokens
const generateTokens = async (user) => {
    const accessToken = generateToken(user, 'access');
    const refreshToken = generateToken(user, 'refresh');
    const { password, ...safeUser } = user;
    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
};
// Verify refresh token
const verifyRefreshToken = async (token) => {
    try {
        if (await isTokenBlacklisted(token))
            return null;
        return jsonwebtoken_1.default.verify(token, env_1.config.jwtRefreshSecret);
    }
    catch (error) {
        return null;
    }
};
// Blacklist a token
const blacklistToken = async (token, expiresAt) => {
    await prisma.tokenBlacklist.create({
        data: { token, expiresAt },
    });
};
exports.blacklistToken = blacklistToken;
// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
        where: { token },
    });
    return !!blacklistedToken;
};
const verifyAccessToken = async (token) => {
    try {
        if (await isTokenBlacklisted(token))
            return null;
        return jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyAccessToken = verifyAccessToken;
const refreshTokens = async (token) => {
    const decoded = await verifyRefreshToken(token);
    if (!decoded || decoded.type !== 'refresh') {
        throw new errors_1.AppError('Invalid or expired refresh token', 401);
    }
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { teacher: true, student: true }
    });
    if (!user) {
        throw new errors_1.AppError('User not found', 404);
    }
    await (0, exports.blacklistToken)(token, new Date(decoded.exp * 1000));
    return generateTokens(user);
};
exports.refreshTokens = refreshTokens;
