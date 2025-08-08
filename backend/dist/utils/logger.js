"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.createLogger = void 0;
const env_1 = require("../config/env");
const winston_1 = __importStar(require("winston"));
require("winston-daily-rotate-file");
const { combine, timestamp, printf, colorize, errors } = winston_1.format;
// Create a custom format for console output
const consoleFormat = combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), colorize({ all: true }), printf(({ level, message, timestamp, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return logMessage;
}));
// Create a JSON format for file output
const fileFormat = combine(timestamp(), errors({ stack: true }), winston_1.format.json());
// Create transports array
const transports = [
    // Console transport for development
    new winston_1.default.transports.Console({
        format: consoleFormat,
        level: env_1.config.isDevelopment ? 'debug' : 'info',
    }),
    // File transport for production
    new winston_1.default.transports.DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
        level: 'info',
    }),
    // Error file transport
    new winston_1.default.transports.DailyRotateFile({
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
const logger = winston_1.default.createLogger({
    level: 'info',
    format: fileFormat,
    defaultMeta: { service: 'tutor-game-api' },
    transports,
    exitOnError: false, // We handle exit manually
});
exports.logger = logger;
// --- Centralized Unhandled Exception and Rejection Handlers ---
const exitHandler = (type, error) => {
    logger.error(`${type} found. Shutting down...`, {
        error: error?.stack || error,
    });
    // Give logger time to write file, then exit.
    setTimeout(() => {
        process.exit(1);
    }, 500).unref();
};
process.on('unhandledRejection', (reason) => {
    exitHandler('Unhandled Rejection', reason);
});
process.on('uncaughtException', (error) => {
    exitHandler('Uncaught Exception', error);
});
// Create a child logger with a specific context
const createLogger = (context) => {
    return logger.child({ context });
};
exports.createLogger = createLogger;
exports.default = logger;
