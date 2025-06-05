import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Security middleware that sets various HTTP headers for security
 */
export const securityHeaders = [
  // Set security HTTP headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    xssFilter: true,
  }),

  // Prevent clickjacking
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  },

  // Set X-Content-Type-Options
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },

  // Set Referrer-Policy
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  },

  // Set Permissions-Policy
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
    next();
  },
];

/**
 * Middleware to prevent HTTP Parameter Pollution
 */
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  // Check for duplicate query parameters
  const queryParams = new Set<string>();
  for (const key in req.query) {
    if (queryParams.has(key)) {
      logger.warn(`Duplicate query parameter detected: ${key}`, { url: req.originalUrl });
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Duplicate query parameters are not allowed',
      });
    }
    queryParams.add(key);
  }
  next();
};

/**
 * Middleware to validate content type for specific routes
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  const methods = ['POST', 'PUT', 'PATCH'];
  
  if (methods.includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({
      success: false,
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json',
    });
  }
  
  next();
};

/**
 * Middleware to block bad bots and scrapers
 */
export const blockBadBots = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const badBots = [
    'AhrefsBot',
    'MJ12bot',
    'SemrushBot',
    'Baiduspider',
    'spbot',
    'DotBot',
    'rogerbot',
    'Exabot',
    'linkdexbot',
    'BLEXBot',
  ];

  const isBadBot = badBots.some(bot => userAgent.includes(bot));
  
  if (isBadBot) {
    logger.warn(`Blocked bad bot: ${userAgent}`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied',
    });
  }
  
  next();
};

/**
 * Middleware to limit request body size
 */
export const limitBodySize = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      const limitInBytes = toBytes(limit);
      
      if (contentLength > limitInBytes) {
        return res.status(413).json({
          success: false,
          error: 'Payload Too Large',
          message: `Request body size exceeds ${limit}`,
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper function to convert size string to bytes
 */
function toBytes(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+)([kmg]?b?)?$/);
  if (!match) return 0;
  
  const [, numStr, unit] = match;
  const num = parseInt(numStr, 10);
  const unitKey = unit ? unit.replace(/b$/, '') : 'b';
  
  return num * (units[unitKey] || 1);
}

/**
 * Middleware to log all requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, ip, headers } = req;
  
  // Skip logging for health checks and favicon
  if (originalUrl === '/health' || originalUrl === '/favicon.ico') {
    return next();
  }
  
  // Log the request
  logger.info(`Request: ${method} ${originalUrl}`, {
    ip,
    method,
    url: originalUrl,
    userAgent: headers['user-agent'],
    referrer: headers.referer || headers.referrer,
  } as any);
  
  // Log the response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logData = {
      status: statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      contentType: res.get('content-type'),
    };
    
    if (statusCode >= 500) {
      logger.error(`Response: ${method} ${originalUrl}`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`Response: ${method} ${originalUrl}`, logData);
    } else {
      logger.info(`Response: ${method} ${originalUrl}`, logData);
    }
  });
  
  next();
};
