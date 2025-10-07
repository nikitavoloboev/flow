import { z } from 'zod';

export const createDatabaseFormSchema = z.object({
  databaseSelection: z.object({
    dbType: z.enum(['PostgreSQL', 'MySQL', 'Redis', 'MongoDB'] as const),
  }),
  containerConfiguration: z.object({
    // Basic container configuration
    name: z
      .string()
      .min(1, 'Database name is required')
      .max(50, 'Name cannot exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Only letters, numbers, hyphens and underscores are allowed',
      ),
    port: z
      .number()
      .min(1024, 'Port must be greater than 1024')
      .max(65535, 'Port must be less than 65535'),
    version: z.string().min(1, 'Version is required'),

    // Authentication configuration (basic fields)
    username: z.string().optional(),
    password: z
      .string()
      .min(4, 'Password must be at least 4 characters')
      .optional(),
    databaseName: z.string().optional(),

    // Default configurations
    persistData: z.boolean(),
    enableAuth: z.boolean(),
    maxConnections: z.number().optional(),

    // Database-specific configurations
    postgresSettings: z
      .object({
        initdbArgs: z.string().optional(),
        hostAuthMethod: z.string().optional(),
        sharedPreloadLibraries: z.string().optional(),
      })
      .optional(),

    mysqlSettings: z
      .object({
        rootHost: z.string().optional(),
        characterSet: z.string().optional(),
        collation: z.string().optional(),
        sqlMode: z.string().optional(),
      })
      .optional(),

    redisSettings: z
      .object({
        maxMemory: z.string().optional(),
        maxMemoryPolicy: z.string().optional(),
        appendOnly: z.boolean().optional(),
        requirePass: z.boolean().optional(),
      })
      .optional(),

    mongoSettings: z
      .object({
        authSource: z.string().optional(),
        enableSharding: z.boolean().optional(),
        oplogSize: z.string().optional(),
      })
      .optional(),
  }),
});

export type CreateDatabaseFormValidation = z.infer<
  typeof createDatabaseFormSchema
>;
