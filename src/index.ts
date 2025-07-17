#!/usr/bin/env bun

import { MCPServerRegistry } from '@/core/server-registry.js';
import { GitHubServer, DatabaseServer, TestRailServer } from '@/servers/index.js';
import { loadConfig, validateConfig, Logger } from '@/utils/index.js';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();
  
  // Initialize logger
  const logger = new Logger(config.logging.level, config.logging.format);
  
  try {
    // Validate configuration
    const configErrors = validateConfig(config);
    if (configErrors.length > 0) {
      logger.error('Configuration validation failed:');
      configErrors.forEach(error => logger.error(`- ${error}`));
      process.exit(1);
    }

    logger.info('Starting MCP Tools server...');
    logger.info(`Enabled servers: ${config.servers.join(', ')}`);

    // Create server registry
    const registry = new MCPServerRegistry(config);

    // Register enabled servers
    if (config.servers.includes('github')) {
      const githubServer = new GitHubServer(config.platforms.github!);
      registry.registerServer(githubServer);
    }

    if (config.servers.includes('database')) {
      const databaseServer = new DatabaseServer(config.platforms.database!);
      registry.registerServer(databaseServer);
    }

    if (config.servers.includes('testrail')) {
      const testrailServer = new TestRailServer(config.platforms.testrail!);
      registry.registerServer(testrailServer);
    }

    // Initialize all servers
    await registry.initializeAll();

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await registry.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      await registry.cleanup();
      process.exit(0);
    });

    // Start the main server
    await registry.start();
    
  } catch (error) {
    logger.error('Failed to start MCP Tools server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Start the application
if (import.meta.main) {
  main().catch((error) => {
    console.error('Application startup failed:', error);
    process.exit(1);
  });
}