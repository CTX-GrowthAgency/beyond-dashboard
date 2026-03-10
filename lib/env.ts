import { z } from "zod";

// Environment variable validation schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Firebase Configuration
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  
  // SMTP Configuration
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number),
  SMTP_SECURE: z.string().regex(/^(true|false)$/).transform(Boolean),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  
  // Application URLs
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  MAIN_APP_URL: z.string().url(),
  
  // Security (Optional)
  SESSION_SECRET: z.string().min(32).optional(),
  CORS_ORIGIN: z.string().url().optional(),
  
  // Database (Optional)
  DATABASE_URL: z.string().url().optional(),
});

// Type for validated environment variables
export type Env = z.infer<typeof EnvSchema>;

// Validate and export environment variables
let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.issues.map((issue: any) => issue.path.join('.')).join(', ');
    console.error("❌ Missing or invalid environment variables:");
    console.error(missingVars);
    console.error("\nPlease check your .env.local file and ensure all required variables are set.");
    process.exit(1);
  }
  throw error;
}

export default env;

// Helper function to get env var with fallback
export function getEnvVar(key: keyof Env, fallback?: string): string {
  const value = env[key];
  if (typeof value === 'string') {
    return value || fallback || "";
  }
  return String(value) || fallback || "";
}

// Runtime environment check
export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}

export function isTest(): boolean {
  return env.NODE_ENV === "test";
}
