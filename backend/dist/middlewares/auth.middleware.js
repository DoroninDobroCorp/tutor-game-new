"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
const errors_1 = require("../utils/errors");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.AppError('Authentication invalid, no token provided', 401);
        }
        const token = authHeader.split(' ')[1];
        // Используем новую функцию верификации access-токена
        const decoded = await (0, auth_service_1.verifyAccessToken)(token);
        if (!decoded) {
            throw new errors_1.AppError('Authentication invalid or token expired', 401);
        }
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
            throw new errors_1.AppError('Not authorized to access this route', 403);
        }
        next();
    };
};
exports.authorize = authorize;
