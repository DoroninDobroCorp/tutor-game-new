import { Response } from 'express';
import { logger } from './logger';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Send a successful response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  }
): void => {
  const response: ApiResponse<T> = {
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

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message: string | Error,
  statusCode = 500,
  error?: any
): void => {
  const errorMessage = message instanceof Error ? message.message : message;
  const errorName = message instanceof Error ? message.name : 'Error';
  
  // Log the error with type-safe error handling
  logger.error(`${errorName}: ${errorMessage}`, { 
    statusCode, 
    stack: message instanceof Error ? message.stack : undefined,
    error: error ? String(error) : undefined
  } as any);

  const response: ApiResponse<null> = {
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

/**
 * Send a validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: Record<string, string[]>,
  message = 'Validation failed'
): void => {
  logger.warn(`Validation error: ${message}`, { errors } as any);
  
  const response: ApiResponse<null> = {
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

/**
 * Send a not found response
 */
export const sendNotFound = (res: Response, message = 'Resource not found'): void => {
  logger.warn(`Not found: ${message}`, {} as any);
  
  const response: ApiResponse<null> = {
    success: false,
    message,
    error: 'Not Found',
    code: 404,
  };

  res.status(404).json(response);
};

/**
 * Send an unauthorized response
 */
export const sendUnauthorized = (res: Response, message = 'Unauthorized'): void => {
  logger.warn(`Unauthorized: ${message}`, {} as any);
  
  const response: ApiResponse<null> = {
    success: false,
    message,
    error: 'Unauthorized',
    code: 401,
  };

  res.status(401).json(response);
};

/**
 * Send a forbidden response
 */
export const sendForbidden = (res: Response, message = 'Forbidden'): void => {
  logger.warn(`Forbidden: ${message}`, {} as any);
  
  const response: ApiResponse<null> = {
    success: false,
    message,
    error: 'Forbidden',
    code: 403,
  };

  res.status(403).json(response);
};

/**
 * Send a rate limit exceeded response
 */
export const sendRateLimitExceeded = (res: Response, message = 'Too many requests'): void => {
  logger.warn(`Rate limit exceeded: ${message}`, {} as any);
  
  const response: ApiResponse<null> = {
    success: false,
    message,
    error: 'Too Many Requests',
    code: 429,
  };

  res.status(429)
    .set('Retry-After', '900') // 15 minutes in seconds
    .json(response);
};
