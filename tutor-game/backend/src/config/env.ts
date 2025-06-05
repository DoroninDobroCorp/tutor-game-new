import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3002'),
  
  // JWT
  JWT_SECRET: z.string().min(32).default('your_secure_jwt_secret_here'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Security
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().default('100'),
  ENABLE_RATE_LIMITING: z.string().default('true'),
  
  // External APIs
  OPENAI_API_KEY: z.string().optional(),
  LEONARDO_API_KEY: z.string().optional(),
  LEONARDO_MODEL_ID: z.string().optional(),
  
  // Feature flags
  ENABLE_LOGGING: z.string().default('true'),
});

// Validate environment variables
const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

// Export validated config
export const config = {
  // Server
  env: envVars.data.NODE_ENV,
  port: parseInt(envVars.data.PORT, 10),
  isProduction: envVars.data.NODE_ENV === 'production',
  isDevelopment: envVars.data.NODE_ENV === 'development',
  
  // JWT
  jwtSecret: envVars.data.JWT_SECRET,
  jwtExpiresIn: envVars.data.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: envVars.data.REFRESH_TOKEN_EXPIRES_IN,
  
  // Database
  databaseUrl: envVars.data.DATABASE_URL,
  
  // Security
  corsOrigin: envVars.data.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
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
} as const;

// Type for the config object
export type Config = typeof config;
