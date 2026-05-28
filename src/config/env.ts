/**
 * Validates required environment variables at startup.
 */
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  CORS_ORIGIN: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  /** Folder prefix for review photos in Cloudinary. */
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).default('food-blog/reviews'),
  PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

/** Parsed env — throws on boot if misconfigured. */
export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
