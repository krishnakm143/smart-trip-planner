import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ quiet: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// connection string'),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  // One origin, or several separated by commas (local client and the hosted site).
  CLIENT_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url('must be a URL such as https://example.com')).min(1)),
  // Number of reverse proxies in front of the API; 1 on hosts such as Railway or Render.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  MAPS_PROVIDER: z.enum(['local', 'osm', 'google']).optional(),
  GOOGLE_MAPS_API_KEY: z.string().trim().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${problems}\nSee server/.env.example.`);
  process.exit(1);
}

const env = parsed.data;

if (env.MAPS_PROVIDER === 'google' && !env.GOOGLE_MAPS_API_KEY) {
  console.error(
    'Invalid environment configuration:\n  MAPS_PROVIDER=google needs GOOGLE_MAPS_API_KEY\nSee server/.env.example.',
  );
  process.exit(1);
}

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  isTest: env.NODE_ENV === 'test',
  isDev: env.NODE_ENV === 'development',
  port: env.PORT,
  mongodbUri: env.MONGODB_URI,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  clientOrigins: env.CLIENT_ORIGIN.map((origin) => new URL(origin).origin),
  trustProxy: env.TRUST_PROXY,
  mapsProvider: env.MAPS_PROVIDER ?? (env.GOOGLE_MAPS_API_KEY ? 'google' : 'local'),
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
});
