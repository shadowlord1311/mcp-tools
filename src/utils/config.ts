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
 * Load configuration from environment variables and defaults
 */
export function loadConfig(): AppConfig {
  const config = { ...defaultConfig };
  
  // Override with environment variables if available
  if (process.env.MCP_SERVERS) {
    config.servers = process.env.MCP_SERVERS.split(',').map(s => s.trim());
  }
  
  return config;
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