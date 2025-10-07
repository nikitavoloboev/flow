import { motion } from 'framer-motion';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { CodeBlock } from '../../../shared/components/ui/code-block';
import { CreateDatabaseFormValidation } from '../schemas/database-form.schema';

interface Props {
  form: UseFormReturn<CreateDatabaseFormValidation>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

// Function to generate Docker command based on configuration
function generateDockerCommand(formData: CreateDatabaseFormValidation): string {
  const { databaseSelection, containerConfiguration } = formData;
  const { dbType } = databaseSelection;
  const {
    name,
    port,
    version,
    username,
    password,
    databaseName,
    persistData,
    enableAuth,
    postgresSettings,
    mysqlSettings,
    redisSettings,
    mongoSettings,
  } = containerConfiguration;

  // Command lines formatted for better readability
  const lines: string[] = ['docker run -d \\'];

  // Add container name
  lines.push(`  --name ${name} \\`);

  // Add port mapping and other configurations based on database type
  switch (dbType) {
    case 'PostgreSQL':
      lines.push(`  -p ${port}:5432 \\`);

      // Basic environment variables
      lines.push(`  -e POSTGRES_USER=${username || 'postgres'} \\`);
      lines.push(`  -e POSTGRES_PASSWORD=${password} \\`);
      if (databaseName) {
        lines.push(`  -e POSTGRES_DB=${databaseName} \\`);
      }

      // PostgreSQL-specific configurations
      if (postgresSettings?.initdbArgs) {
        lines.push(
          `  -e POSTGRES_INITDB_ARGS="${postgresSettings.initdbArgs}" \\`,
        );
      }
      if (postgresSettings?.hostAuthMethod) {
        lines.push(
          `  -e POSTGRES_HOST_AUTH_METHOD=${postgresSettings.hostAuthMethod} \\`,
        );
      }
      if (postgresSettings?.sharedPreloadLibraries) {
        lines.push(
          `  -e POSTGRES_SHARED_PRELOAD_LIBRARIES=${postgresSettings.sharedPreloadLibraries} \\`,
        );
      }

      // Data persistence
      if (persistData) {
        lines.push(`  -v ${name}-data:/var/lib/postgresql/data \\`);
      }

      lines.push(`  postgres:${version}`);
      break;

    case 'MySQL':
      lines.push(`  -p ${port}:3306 \\`);

      // Basic environment variables
      lines.push(`  -e MYSQL_ROOT_PASSWORD=${password} \\`);
      if (databaseName) {
        lines.push(`  -e MYSQL_DATABASE=${databaseName} \\`);
      }

      // MySQL-specific configurations
      if (mysqlSettings?.rootHost) {
        lines.push(`  -e MYSQL_ROOT_HOST=${mysqlSettings.rootHost} \\`);
      }
      if (mysqlSettings?.characterSet) {
        lines.push(`  -e MYSQL_CHARSET=${mysqlSettings.characterSet} \\`);
      }
      if (mysqlSettings?.collation) {
        lines.push(`  -e MYSQL_COLLATION=${mysqlSettings.collation} \\`);
      }
      if (mysqlSettings?.sqlMode) {
        lines.push(`  -e MYSQL_SQL_MODE=${mysqlSettings.sqlMode} \\`);
      }

      // Data persistence
      if (persistData) {
        lines.push(`  -v ${name}-data:/var/lib/mysql \\`);
      }

      lines.push(`  mysql:${version}`);
      break;

    case 'Redis':
      lines.push(`  -p ${port}:6379 \\`);

      // Data persistence
      if (persistData) {
        lines.push(`  -v ${name}-data:/data \\`);
      }

      // Redis command with specific configurations
      const redisCommand = 'redis-server';
      const redisArgs: string[] = [];

      if (password) {
        redisArgs.push(`--requirepass ${password}`);
      }
      if (redisSettings?.maxMemory) {
        redisArgs.push(`--maxmemory ${redisSettings.maxMemory}`);
      }
      if (redisSettings?.maxMemoryPolicy) {
        redisArgs.push(`--maxmemory-policy ${redisSettings.maxMemoryPolicy}`);
      }
      if (redisSettings?.appendOnly) {
        redisArgs.push('--appendonly yes');
      }

      if (redisArgs.length > 0) {
        lines.push(`  redis:${version} ${redisCommand} ${redisArgs.join(' ')}`);
      } else {
        lines.push(`  redis:${version}`);
      }
      break;

    case 'MongoDB':
      lines.push(`  -p ${port}:27017 \\`);

      // Environment variables for authentication
      if (enableAuth && username && password) {
        lines.push(`  -e MONGO_INITDB_ROOT_USERNAME=${username} \\`);
        lines.push(`  -e MONGO_INITDB_ROOT_PASSWORD=${password} \\`);
      }
      if (databaseName) {
        lines.push(`  -e MONGO_INITDB_DATABASE=${databaseName} \\`);
      }

      // MongoDB-specific configurations
      if (mongoSettings?.authSource) {
        lines.push(`  -e MONGO_AUTH_SOURCE=${mongoSettings.authSource} \\`);
      }
      if (mongoSettings?.oplogSize) {
        lines.push(`  -e MONGO_OPLOG_SIZE=${mongoSettings.oplogSize} \\`);
      }

      // Data persistence
      if (persistData) {
        lines.push(`  -v ${name}-data:/data/db \\`);
      }

      lines.push(`  mongo:${version}`);
      break;
  }

  return lines.join('\n');
}

export function ReviewStep({ form }: Props) {
  const formData = form.watch();
  const dockerCommand = generateDockerCommand(formData);

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <div className="text-sm font-medium text-foreground text-center mb-4">
          Docker command that will be executed
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardContent>
            <CodeBlock
              language="bash"
              filename="docker-command.sh"
              code={dockerCommand}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
