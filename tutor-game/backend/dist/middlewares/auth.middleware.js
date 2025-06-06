"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
const error_middleware_1 = require("./error.middleware");
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new error_middleware_1.AppError('Authentication invalid', 401);
        }
        const token = authHeader.split(' ')[1];
        // Verify token
        const decoded = await (0, auth_service_1.verifyToken)(token);
        if (!decoded) {
            throw new error_middleware_1.AppError('Authentication invalid', 401);
        }
        // Add user to request
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new error_middleware_1.AppError('Not authorized to access this route', 403);
        }
        next();
    };
};
exports.authorize = authorize;
