import { parse } from 'yaml';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { AppConfig } from '@/types/index.js';

/**
 * Default application configuration
 */
export const defaultConfig: AppConfig = {
  servers: ['github', 'database', 'testrail'],
  platforms: {
    github: {
      type: 'github',
      config: {
        token: process.env.GITHUB_TOKEN || '',
        baseUrl: 'https://api.github.com',
      },
    },
    database: {
      type: 'database',
      config: {
        connectionString: process.env.DATABASE_URL || '',
        type: 'postgresql', // postgresql, mysql, sqlite
      },
    },
    testrail: {
      type: 'testrail',
      config: {
        baseUrl: process.env.TESTRAIL_URL || '',
        username: process.env.TESTRAIL_USERNAME || '',
        password: process.env.TESTRAIL_PASSWORD || '',
      },
    },
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    format: 'text',
  },
};

/**
 * Load configuration from YAML file, environment variables, and defaults
 */
export function loadConfig(): AppConfig {
  // Start with default configuration
  let config = { ...defaultConfig };
  
  // Try to load from YAML configuration file
  const configPath = join(process.cwd(), 'mcpconfig.yml');
  if (existsSync(configPath)) {
    try {
      const yamlContent = readFileSync(configPath, 'utf-8');
      const yamlConfig = parse(yamlContent) as Partial<AppConfig>;
      
      // Deep merge YAML config with defaults
      config = mergeConfigs(config, yamlConfig);
    } catch (error) {
      console.warn(`Warning: Failed to parse mcpconfig.yml: ${error}`);
      console.warn('Falling back to default configuration and environment variables');
    }
  }
  
  // Override with environment variables (highest priority)
  config = applyEnvironmentOverrides(config);
  
  return config;
}

/**
 * Apply environment variable overrides to configuration
 */
function applyEnvironmentOverrides(config: AppConfig): AppConfig {
  const result = { ...config };
  
  // Override servers list
  if (process.env.MCP_SERVERS) {
    result.servers = process.env.MCP_SERVERS.split(',').map(s => s.trim());
  }
  
  // Override platform configurations with environment variables
  if (result.platforms.github) {
    if (process.env.GITHUB_TOKEN) {
      result.platforms.github.config.token = process.env.GITHUB_TOKEN;
    }
    if (process.env.GITHUB_BASE_URL) {
      result.platforms.github.config.baseUrl = process.env.GITHUB_BASE_URL;
    }
  }
  
  if (result.platforms.database) {
    if (process.env.DATABASE_URL) {
      result.platforms.database.config.connectionString = process.env.DATABASE_URL;
    }
    if (process.env.DATABASE_TYPE) {
      result.platforms.database.config.type = process.env.DATABASE_TYPE;
    }
  }
  
  if (result.platforms.testrail) {
    if (process.env.TESTRAIL_URL) {
      result.platforms.testrail.config.baseUrl = process.env.TESTRAIL_URL;
    }
    if (process.env.TESTRAIL_USERNAME) {
      result.platforms.testrail.config.username = process.env.TESTRAIL_USERNAME;
    }
    if (process.env.TESTRAIL_PASSWORD) {
      result.platforms.testrail.config.password = process.env.TESTRAIL_PASSWORD;
    }
  }
  
  // Override logging configuration
  if (process.env.LOG_LEVEL) {
    result.logging.level = process.env.LOG_LEVEL as any;
  }
  if (process.env.LOG_FORMAT) {
    result.logging.format = process.env.LOG_FORMAT as any;
  }
  
  return result;
}

/**
 * Deep merge two configuration objects
 */
function mergeConfigs(target: AppConfig, source: Partial<AppConfig>): AppConfig {
  const result = { ...target };
  
  if (source.servers) {
    result.servers = [...source.servers];
  }
  
  if (source.platforms) {
    result.platforms = { ...result.platforms };
    for (const [key, platform] of Object.entries(source.platforms)) {
      if (platform) {
        result.platforms[key] = {
          ...result.platforms[key],
          ...platform,
          config: {
            ...result.platforms[key]?.config,
            ...platform.config,
          },
        };
      }
    }
  }
  
  if (source.logging) {
    result.logging = {
      ...result.logging,
      ...source.logging,
    };
  }
  
  return result;
}

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  
  // Check that enabled servers have platform configurations
  for (const serverName of config.servers) {
    if (!config.platforms[serverName]) {
      errors.push(`No platform configuration found for server: ${serverName}`);
    }
  }
  
  // Validate GitHub configuration
  if (config.servers.includes('github')) {
    const githubConfig = config.platforms.github?.config;
    if (!githubConfig?.token) {
      errors.push('GitHub server enabled but GITHUB_TOKEN not provided');
    }
  }
  
  // Validate database configuration
  if (config.servers.includes('database')) {
    const dbConfig = config.platforms.database?.config;
    if (!dbConfig?.connectionString) {
      errors.push('Database server enabled but DATABASE_URL not provided');
    }
  }
  
  // Validate TestRail configuration
  if (config.servers.includes('testrail')) {
    const trConfig = config.platforms.testrail?.config;
    if (!trConfig?.baseUrl || !trConfig?.username || !trConfig?.password) {
      errors.push('TestRail server enabled but required credentials not provided');
    }
  }
  
  return errors;
}