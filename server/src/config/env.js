import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ quiet: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// connection string').optional().default('mongodb://localhost:27017/smart_trip_planner'),
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
  // Set both to "supabase" to use Supabase Auth and persist saved trips in Supabase Postgres.
  AUTH_PROVIDER: z.enum(['local', 'supabase']).default('local'),
  TRIP_STORAGE: z.enum(['mongodb', 'supabase']).default('mongodb'),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  // Optional AI provider. Kept server-side: never expose this in Vite variables.
  GROQ_API_KEY: z.string().trim().default(''),
  GROQ_MODEL: z.string().trim().default('llama-3.3-70b-versatile'),
  // Optional transactional email provider for OTP & trip interactions.
  BREVO_API_KEY: z.string().trim().default(''),
  BREVO_SENDER_EMAIL: z.string().trim().default('notifications@smarttripplanner.com'),
  BREVO_SENDER_NAME: z.string().trim().default('Smart Trip Planner'),
});

const configuredSupabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const isDevOrTest = (process.env.NODE_ENV || 'development') !== 'production';

const rawEnv = {
  ...process.env,
  SUPABASE_PUBLISHABLE_KEY: configuredSupabaseKey || (isDevOrTest ? 'dev-placeholder-anon-key' : undefined),
};

const parsed = envSchema.safeParse(rawEnv);

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

if (
  (env.AUTH_PROVIDER === 'supabase' || env.TRIP_STORAGE === 'supabase') &&
  (!env.SUPABASE_URL || !configuredSupabaseKey)
) {
  if (env.NODE_ENV === 'production') {
    console.error(
      'Invalid environment configuration:\n  Supabase Auth or trip storage needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)\nSee server/.env.example.',
    );
    process.exit(1);
  } else {
    console.warn(
      '[Supabase Notice] SUPABASE_ANON_KEY is not yet set in server/.env.\nAdd your Supabase Anon Public Key from Project Settings -> API to sync with your remote database.',
    );
  }
}

if (env.TRIP_STORAGE === 'supabase' && env.AUTH_PROVIDER !== 'supabase') {
  console.error(
    'Invalid environment configuration:\n  TRIP_STORAGE=supabase requires AUTH_PROVIDER=supabase\nSee server/.env.example.',
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
  authProvider: env.AUTH_PROVIDER,
  tripStorage: env.TRIP_STORAGE,
  supabaseUrl: env.SUPABASE_URL,
  supabasePublishableKey: configuredSupabaseKey || (isDevOrTest ? 'dev-placeholder-anon-key' : env.SUPABASE_PUBLISHABLE_KEY),
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  groqApiKey: env.GROQ_API_KEY,
  groqModel: env.GROQ_MODEL,
  brevoApiKey: env.BREVO_API_KEY,
  brevoSenderEmail: env.BREVO_SENDER_EMAIL,
  brevoSenderName: env.BREVO_SENDER_NAME,
});
