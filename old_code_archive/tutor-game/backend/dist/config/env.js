"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
// Define environment variable schema
const envSchema = zod_1.z.object({
    // Server
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3002'),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32).default('your_secure_jwt_secret_here'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32).default('your_secure_refresh_secret_here'),
    JWT_EXPIRES_IN: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: zod_1.z.string().default('7d'),
    // Database
    DATABASE_URL: zod_1.z.string().url(),
    // Security
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('900000'), // 15 minutes
    RATE_LIMIT_MAX: zod_1.z.string().default('100'),
    ENABLE_RATE_LIMITING: zod_1.z.string().default('true'),
    // External APIs
    OPENAI_API_KEY: zod_1.z.string().optional(),
    LEONARDO_API_KEY: zod_1.z.string().optional(),
    LEONARDO_MODEL_ID: zod_1.z.string().optional(),
    // Feature flags
    ENABLE_LOGGING: zod_1.z.string().default('true'),
});
// Validate environment variables
const envVars = envSchema.safeParse(process.env);
if (!envVars.success) {
    console.error('❌ Invalid environment variables:', envVars.error.format());
    process.exit(1);
}
// Export validated config
exports.config = {
    // Server
    env: envVars.data.NODE_ENV,
    port: parseInt(envVars.data.PORT, 10),
    isProduction: envVars.data.NODE_ENV === 'production',
    isDevelopment: envVars.data.NODE_ENV === 'development',
    // JWT
    jwtSecret: envVars.data.JWT_SECRET,
    jwtRefreshSecret: envVars.data.JWT_REFRESH_SECRET,
    jwtExpiresIn: envVars.data.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: envVars.data.REFRESH_TOKEN_EXPIRES_IN,
    // Database
    databaseUrl: envVars.data.DATABASE_URL,
    // Security
    corsOrigin: envVars.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    rateLimit: {
        windowMs: parseInt(envVars.data.RATE_LIMIT_WINDOW_MS, 10),
        max: parseInt(envVars.data.RATE_LIMIT_MAX, 10),
        enabled: envVars.data.ENABLE_RATE_LIMITING === 'true',
    },
    // External APIs
    openaiApiKey: envVars.data.OPENAI_API_KEY,
    leonardoApiKey: envVars.data.LEONARDO_API_KEY,
    leonardoModelId: envVars.data.LEONARDO_MODEL_ID,
    // Feature flags
    features: {
        logging: envVars.data.ENABLE_LOGGING === 'true',
    },
};
