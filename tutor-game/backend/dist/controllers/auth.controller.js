"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenHandler = exports.logoutHandler = exports.getMeHandler = exports.loginHandler = exports.registerHandler = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("../services/auth.service");
const error_middleware_1 = require("../middlewares/error.middleware");
const env_1 = require("../config/env");
// Simple password validation
const validatePassword = (password) => {
    if (password.length < 4) {
        throw new error_middleware_1.AppError('Password must be at least 4 characters long', 400);
    }
};
const registerHandler = async (req, res) => {
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
            throw new error_middleware_1.AppError('Email, password, and role are required', 400);
        }
        const name = `${firstName} ${lastName}`.trim();
        console.log('Processing registration for:', { email, role, name, firstName, lastName });
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new error_middleware_1.AppError('Invalid email format', 400);
        }
        // Validate role
        if (!['TEACHER', 'STUDENT'].includes(role)) {
            throw new error_middleware_1.AppError('Invalid role. Must be TEACHER or STUDENT', 400);
        }
        // Validate password
        validatePassword(password);
        console.log('Attempting to register user:', { email, role, name });
        const { user, accessToken, refreshToken } = await (0, auth_service_1.register)(email, password, role, name);
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
                    role: user.role.toLowerCase(),
                    avatar: undefined,
                },
                accessToken,
                refreshToken,
            },
        };
        console.log('Sending response:', JSON.stringify(response, null, 2));
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Registration error:', error);
        throw error; // Let the error middleware handle it
    }
};
exports.registerHandler = registerHandler;
// Rate limiting store for login attempts
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_TIMEOUT_MINUTES = 15;
const loginHandler = async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    console.log(`Login attempt from IP: ${ip}`);
    const { email, password } = req.body;
    if (!email || !password) {
        throw new error_middleware_1.AppError('Please provide email and password', 400);
    }
    // Check rate limiting
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS) {
        const timeLeft = Math.ceil((new Date().getTime() - attempt.lastAttempt.getTime()) / (1000 * 60));
        if (timeLeft < LOGIN_TIMEOUT_MINUTES) {
            throw new error_middleware_1.AppError(`Too many login attempts. Please try again in ${LOGIN_TIMEOUT_MINUTES - timeLeft} minutes.`, 429);
        }
        else {
            loginAttempts.delete(ip);
        }
    }
    try {
        console.log(`Attempting to log in user: ${email}`);
        const { user, accessToken, refreshToken } = await (0, auth_service_1.login)(email, password, ip);
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
        // Prepare user data for response
        const userData = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role.toLowerCase(),
        };
        // Include refreshToken in the response body for the frontend
        const response = {
            success: true,
            data: {
                user: userData,
                accessToken,
                refreshToken, // Include refresh token in the response
            },
        };
        console.log('Sending login response:', JSON.stringify(response, null, 2));
        res.json(response);
    }
    catch (error) {
        // Increment failed login attempts
        const attempts = (loginAttempts.get(ip)?.count || 0) + 1;
        loginAttempts.set(ip, { count: attempts, lastAttempt: new Date() });
        console.error(`Login failed for IP ${ip}:`, error.message);
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            throw new error_middleware_1.AppError(`Too many failed attempts. Please try again in ${LOGIN_TIMEOUT_MINUTES} minutes.`, 429);
        }
        throw new error_middleware_1.AppError('Invalid email or password', 401);
    }
};
exports.loginHandler = loginHandler;
const getMeHandler = async (req, res) => {
    if (!req.user) {
        throw new error_middleware_1.AppError('Not authenticated', 401);
    }
    const user = await (0, auth_service_1.getCurrentUser)(req.user.userId);
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    res.json({
        success: true,
        data: user,
    });
};
exports.getMeHandler = getMeHandler;
const logoutHandler = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        // Add the current access token to blacklist
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
                await (0, auth_service_1.blacklistToken)(token, new Date(decoded.exp * 1000));
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Logout error:', error);
        next(error);
    }
};
exports.logoutHandler = logoutHandler;
const refreshTokenHandler = async (req, res, next) => {
    // Try to get refresh token from cookies first, then from body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
        throw new error_middleware_1.AppError('Refresh token is required', 400);
    }
    try {
        const { accessToken, refreshToken: newRefreshToken } = await (0, auth_service_1.refreshTokens)(refreshToken);
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
    }
    catch (error) {
        // Clear the invalid refresh token cookie
        res.clearCookie('refreshToken', {
            path: '/api/auth/refresh',
        });
        console.error('Refresh token error:', error);
        throw new error_middleware_1.AppError('Invalid or expired refresh token', 401);
    }
};
exports.refreshTokenHandler = refreshTokenHandler;
