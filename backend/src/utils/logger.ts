import { config } from '../config/env';
import winston, { Logger, format } from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors } = format;

// Create a custom format for console output
const consoleFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  colorize({ all: true }),
  printf(({ level, message, timestamp, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return logMessage;
  })
);

// Create a JSON format for file output
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

// Create transports array
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
    level: config.isDevelopment ? 'debug' : 'info',
  }),
  
  // File transport for production
  new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: 'info',
  }),
  
  // Error file transport
  new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: fileFormat,
  })
];

// Create base logger instance
const logger: Logger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'tutor-game-api' },
  transports,
  exitOnError: false,
});

// Handle uncaught exceptions
if (config.isProduction) {
  process
    .on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', { reason });
    })
    .on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error });
    });
}

// Create a child logger with a specific context
export const createLogger = (context: string) => {
  return logger.child({ context });
};

export { logger };

export default logger;
