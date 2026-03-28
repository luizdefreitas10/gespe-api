import { z } from 'zod'

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  PORT: z.coerce.number().optional().default(3333),
  CORS_ORIGIN: z
    .string()
    .optional()
    .default('http://localhost:3000')
    .transform((v) => v.split(',').map((s) => s.trim())),
})

export type Env = z.infer<typeof envSchema>
