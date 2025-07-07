/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
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

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, true, details);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, true, details);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, true, details);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', details?: any) {
    super(message, 404, true, details);
  }
}

/**
 * 409 Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, true, details);
  }
}

/**
 * 422 Unprocessable Entity Error (for validation errors)
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message: string = 'Validation Error') {
    super(message, 422, true, { errors });
    this.errors = errors;
  }
}

/**
 * 429 Too Many Requests Error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message: string = 'Too Many Requests',
    retryAfter: number = 900, // 15 minutes in seconds
    details?: any
  ) {
    super(message, 429, true, details);
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(message, 500, false, details);
  }
}

/**
 * 501 Not Implemented Error
 */
export class NotImplementedError extends AppError {
  constructor(message: string = 'Not Implemented', details?: any) {
    super(message, 501, true, details);
  }
}

/**
 * 503 Service Unavailable Error
 */
export class ServiceUnavailableError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Service Unavailable',
    retryAfter?: number,
    details?: any
  ) {
    super(message, 503, true, details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  // Default to 500 if status code not set
  const statusCode = err.statusCode || 500;
  
  // Log the error
  if (statusCode >= 500) {
    console.error('Server Error:', err);
  } else {
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

/**
 * Async error handler wrapper for Express routes
 */
export const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
