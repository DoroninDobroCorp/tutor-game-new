"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.ServiceUnavailableError = exports.NotImplementedError = exports.InternalServerError = exports.RateLimitError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
/**
 * Base error class for application-specific errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        // Ensure the error stack is captured
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        // Set the prototype explicitly (needed for instanceof)
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/**
 * 400 Bad Request Error
 */
class BadRequestError extends AppError {
    constructor(message = 'Bad Request', details) {
        super(message, 400, true, details);
    }
}
exports.BadRequestError = BadRequestError;
/**
 * 401 Unauthorized Error
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', details) {
        super(message, 401, true, details);
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * 403 Forbidden Error
 */
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', details) {
        super(message, 403, true, details);
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * 404 Not Found Error
 */
class NotFoundError extends AppError {
    constructor(message = 'Not Found', details) {
        super(message, 404, true, details);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * 409 Conflict Error
 */
class ConflictError extends AppError {
    constructor(message = 'Conflict', details) {
        super(message, 409, true, details);
    }
}
exports.ConflictError = ConflictError;
/**
 * 422 Unprocessable Entity Error (for validation errors)
 */
class ValidationError extends AppError {
    constructor(errors, message = 'Validation Error') {
        super(message, 422, true, { errors });
        this.errors = errors;
    }
}
exports.ValidationError = ValidationError;
/**
 * 429 Too Many Requests Error
 */
class RateLimitError extends AppError {
    constructor(message = 'Too Many Requests', retryAfter = 900, // 15 minutes in seconds
    details) {
        super(message, 429, true, details);
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
/**
 * 500 Internal Server Error
 */
class InternalServerError extends AppError {
    constructor(message = 'Internal Server Error', details) {
        super(message, 500, false, details);
    }
}
exports.InternalServerError = InternalServerError;
/**
 * 501 Not Implemented Error
 */
class NotImplementedError extends AppError {
    constructor(message = 'Not Implemented', details) {
        super(message, 501, true, details);
    }
}
exports.NotImplementedError = NotImplementedError;
/**
 * 503 Service Unavailable Error
 */
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service Unavailable', retryAfter, details) {
        super(message, 503, true, details);
        this.retryAfter = retryAfter;
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Default to 500 if status code not set
    const statusCode = err.statusCode || 500;
    // Log the error
    if (statusCode >= 500) {
        console.error('Server Error:', err);
    }
    else {
        console.warn('Client Error:', err);
    }
    // Don't leak error details in production
    const errorResponse = {
        success: false,
        error: err.name || 'Error',
        message: err.message || 'An error occurred',
        ...(process.env.NODE_ENV !== 'production' && {
            stack: err.stack,
            details: err.details,
        }),
    };
    // Set headers for rate limiting
    if (err instanceof RateLimitError) {
        res.set('Retry-After', String(err.retryAfter));
    }
    // Send the error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
/**
 * Async error handler wrapper for Express routes
 */
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
