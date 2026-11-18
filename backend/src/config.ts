import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('atomic_supply_chain'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
});

export const config = configSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
});
