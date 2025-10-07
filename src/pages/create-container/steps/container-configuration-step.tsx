import { motion } from 'framer-motion';
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../shared/components/ui/accordion';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../shared/components/ui/form';
import { Input } from '../../../shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/components/ui/select';
import { CreateDatabaseFormValidation } from '../schemas/database-form.schema';

interface Props {
  form: UseFormReturn<CreateDatabaseFormValidation>;
  isSubmitting: boolean;
}

interface BaseField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  defaultValue?: string | boolean;
}

interface SelectField extends BaseField {
  type: 'select';
  options: string[];
}

type ConfigField = BaseField | SelectField;

interface DatabaseConfig {
  defaultPort: number;
  versions: string[];
  authentication: {
    supportsAuth: boolean;
    fields: ConfigField[];
  };
  specificConfig: {
    fields: ConfigField[];
  };
}

const databaseConfigs: Record<string, DatabaseConfig> = {
  PostgreSQL: {
    defaultPort: 5432,
    versions: ['16', '15', '14', '13', '12'],
    authentication: {
      supportsAuth: true,
      fields: [
        { name: 'username', label: 'Username', defaultValue: 'postgres' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Password to access PostgreSQL',
        },
        {
          name: 'databaseName',
          label: 'Database Name',
          required: false,
          placeholder: 'Name of the database to create',
        },
      ],
    },
    specificConfig: {
      fields: [
        {
          name: 'initdbArgs',
          label: 'INITDB Arguments',
          type: 'text',
          placeholder: '--auth-host=md5',
        },
        {
          name: 'hostAuthMethod',
          label: 'Authentication Method',
          type: 'select',
          options: ['md5', 'trust', 'scram-sha-256'],
          defaultValue: 'md5',
        } as SelectField,
        {
          name: 'sharedPreloadLibraries',
          label: 'Shared Libraries',
          type: 'text',
          placeholder: 'pg_stat_statements',
        },
      ],
    },
  },
  MySQL: {
    defaultPort: 3306,
    versions: ['8.0', '5.7'],
    authentication: {
      supportsAuth: true,
      fields: [
        {
          name: 'username',
          label: 'Username',
          defaultValue: 'root',
          readonly: true,
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Password for MySQL root user',
        },
        {
          name: 'databaseName',
          label: 'Database Name',
          required: false,
          placeholder: 'Name of the database to create',
        },
      ],
    },
    specificConfig: {
      fields: [
        {
          name: 'rootHost',
          label: 'Root Host',
          type: 'text',
          defaultValue: '%',
        },
        {
          name: 'characterSet',
          label: 'Charset',
          type: 'select',
          options: ['utf8mb4', 'utf8', 'latin1'],
          defaultValue: 'utf8mb4',
        } as SelectField,
        {
          name: 'collation',
          label: 'Collation',
          type: 'text',
          defaultValue: 'utf8mb4_unicode_ci',
        },
        {
          name: 'sqlMode',
          label: 'SQL Mode',
          type: 'text',
          defaultValue: 'TRADITIONAL',
        },
      ],
    },
  },
  Redis: {
    defaultPort: 6379,
    versions: ['7.2', '7.0', '6.2'],
    authentication: {
      supportsAuth: true,
      fields: [
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Password to access Redis',
        },
      ],
    },
    specificConfig: {
      fields: [
        {
          name: 'maxMemory',
          label: 'Max Memory',
          type: 'text',
          defaultValue: '256mb',
        },
        {
          name: 'maxMemoryPolicy',
          label: 'Memory Policy',
          type: 'select',
          options: [
            'allkeys-lru',
            'volatile-lru',
            'allkeys-random',
            'volatile-random',
            'volatile-ttl',
            'noeviction',
          ],
          defaultValue: 'allkeys-lru',
        } as SelectField,
        {
          name: 'appendOnly',
          label: 'Append Only',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'requirePass',
          label: 'Requires Password',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  },
  MongoDB: {
    defaultPort: 27017,
    versions: ['7.0', '6.0', '5.0'],
    authentication: {
      supportsAuth: true,
      fields: [
        { name: 'username', label: 'Username', defaultValue: 'admin' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Password for MongoDB admin user',
        },
        {
          name: 'databaseName',
          label: 'Database Name',
          required: false,
          placeholder: 'Name of the database to create',
        },
      ],
    },
    specificConfig: {
      fields: [
        {
          name: 'authSource',
          label: 'Auth Source',
          type: 'text',
          defaultValue: 'admin',
        },
        {
          name: 'enableSharding',
          label: 'Enable Sharding',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'oplogSize',
          label: 'Oplog Size (MB)',
          type: 'text',
          defaultValue: '512',
        },
      ],
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
      staggerChildren: 0.08,
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

export function ContainerConfigurationStep({ form, isSubmitting }: Props) {
  const selectedDbType = form.watch('databaseSelection.dbType');
  const config = databaseConfigs[selectedDbType];

  // Set default values when database type changes
  React.useEffect(() => {
    if (config) {
      // Set default port
      const currentPort = form.getValues('containerConfiguration.port');
      if (
        !currentPort ||
        Object.values(databaseConfigs).some(
          (dbConfig) => dbConfig.defaultPort === currentPort,
        )
      ) {
        form.setValue('containerConfiguration.port', config.defaultPort);
      }

      // Set default authentication values
      if (config.authentication.supportsAuth) {
        config.authentication.fields.forEach((field) => {
          if (field.defaultValue !== undefined) {
            form.setValue(
              `containerConfiguration.${field.name}` as any,
              field.defaultValue,
            );
          }
        });
      }

      // Set default database-specific values
      if (config.specificConfig) {
        const settingsKey =
          `${selectedDbType.toLowerCase()}Settings` as keyof typeof form.getValues;
        config.specificConfig.fields.forEach((field) => {
          if (field.defaultValue !== undefined) {
            form.setValue(
              `containerConfiguration.${settingsKey}.${field.name}` as any,
              field.defaultValue,
            );
          }
        });
      }
    }
  }, [selectedDbType, config, form]);

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2">
      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <div className="text-sm font-medium text-foreground text-center mb-4">
            {selectedDbType} Database Configuration
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Accordion
            type="multiple"
            defaultValue={['container']}
            className="w-full"
          >
            {/* Section 1: Basic container configuration */}
            <AccordionItem value="container">
              <AccordionTrigger className="text-sm font-medium">
                Database Configuration
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Container name */}
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="containerConfiguration.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Database Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`my-${selectedDbType.toLowerCase()}-database`}
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Port */}
                  <div>
                    <FormField
                      control={form.control}
                      name="containerConfiguration.port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={config?.defaultPort.toString()}
                              disabled={isSubmitting}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Version */}
                  <div>
                    <FormField
                      control={form.control}
                      name="containerConfiguration.version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select version" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {config?.versions.map((version) => (
                                <SelectItem key={version} value={version}>
                                  {version}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Authentication */}
            {config?.authentication.supportsAuth && (
              <AccordionItem value="auth">
                <AccordionTrigger className="text-sm font-medium">
                  Authentication
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    {config.authentication.fields.map((field) => (
                      <div
                        key={field.name}
                        className={
                          field.name === 'password' ? 'col-span-2' : ''
                        }
                      >
                        <FormField
                          control={form.control}
                          name={`containerConfiguration.${field.name}` as any}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel>
                                {field.label}
                                {field.required && ' *'}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type={field.type || 'text'}
                                  placeholder={field.placeholder}
                                  disabled={isSubmitting || field.readonly}
                                  {...formField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Section 3: Database-specific configurations */}
            {config?.specificConfig &&
              config.specificConfig.fields.length > 0 && (
                <AccordionItem value="specific">
                  <AccordionTrigger className="text-sm font-medium">
                    {selectedDbType} Specific Configuration
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {config.specificConfig.fields.map((field) => {
                        const settingsKey = `${selectedDbType.toLowerCase()}Settings`;
                        return (
                          <div key={field.name}>
                            <FormField
                              control={form.control}
                              name={
                                `containerConfiguration.${settingsKey}.${field.name}` as any
                              }
                              render={({ field: formField }) => (
                                <FormItem>
                                  <FormLabel>
                                    {field.label}
                                    {field.required && ' *'}
                                  </FormLabel>
                                  <FormControl>
                                    {field.type === 'select' &&
                                    'options' in field ? (
                                      <Select
                                        onValueChange={formField.onChange}
                                        value={formField.value}
                                        disabled={isSubmitting}
                                      >
                                        <SelectTrigger>
                                          <SelectValue
                                            placeholder={`Select ${field.label.toLowerCase()}`}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(field as SelectField).options.map(
                                            (option: string) => (
                                              <SelectItem
                                                key={option}
                                                value={option}
                                              >
                                                {option}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        type={field.type || 'text'}
                                        placeholder={field.placeholder}
                                        disabled={isSubmitting}
                                        {...formField}
                                      />
                                    )}
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
          </Accordion>
        </motion.div>
      </motion.div>
    </div>
  );
}
