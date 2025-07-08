"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRateLimitExceeded = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendValidationError = exports.sendError = exports.sendSuccess = void 0;
const logger_1 = require("./logger");
/**
 * Send a successful response
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta) => {
    const response = {
        success: true,
        message,
        data,
        code: statusCode,
    };
    if (meta) {
        response.meta = meta;
    }
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
/**
 * Send an error response
 */
const sendError = (res, message, statusCode = 500, error) => {
    const errorMessage = message instanceof Error ? message.message : message;
    const errorName = message instanceof Error ? message.name : 'Error';
    // Log the error with type-safe error handling
    logger_1.logger.error(`${errorName}: ${errorMessage}`, {
        statusCode,
        stack: message instanceof Error ? message.stack : undefined,
        error: error ? String(error) : undefined
    });
    const response = {
        success: false,
        message: errorMessage,
        error: errorName,
        code: statusCode,
    };
    // In production, don't expose error details
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        response.message = 'Internal server error';
    }
    res.status(statusCode).json(response);
};
exports.sendError = sendError;
/**
 * Send a validation error response
 */
const sendValidationError = (res, errors, message = 'Validation failed') => {
    logger_1.logger.warn(`Validation error: ${message}`, { errors });
    const response = {
        success: false,
        message,
        error: 'Validation Error',
        code: 400,
        data: null,
    };
    res.status(400).json({
        ...response,
        errors,
    });
};
exports.sendValidationError = sendValidationError;
/**
 * Send a not found response
 */
const sendNotFound = (res, message = 'Resource not found') => {
    logger_1.logger.warn(`Not found: ${message}`, {});
    const response = {
        success: false,
        message,
        error: 'Not Found',
        code: 404,
    };
    res.status(404).json(response);
};
exports.sendNotFound = sendNotFound;
/**
 * Send an unauthorized response
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
    logger_1.logger.warn(`Unauthorized: ${message}`, {});
    const response = {
        success: false,
        message,
        error: 'Unauthorized',
        code: 401,
    };
    res.status(401).json(response);
};
exports.sendUnauthorized = sendUnauthorized;
/**
 * Send a forbidden response
 */
const sendForbidden = (res, message = 'Forbidden') => {
    logger_1.logger.warn(`Forbidden: ${message}`, {});
    const response = {
        success: false,
        message,
        error: 'Forbidden',
        code: 403,
    };
    res.status(403).json(response);
};
exports.sendForbidden = sendForbidden;
/**
 * Send a rate limit exceeded response
 */
const sendRateLimitExceeded = (res, message = 'Too many requests') => {
    logger_1.logger.warn(`Rate limit exceeded: ${message}`, {});
    const response = {
        success: false,
        message,
        error: 'Too Many Requests',
        code: 429,
    };
    res.status(429)
        .set('Retry-After', '900') // 15 minutes in seconds
        .json(response);
};
exports.sendRateLimitExceeded = sendRateLimitExceeded;
