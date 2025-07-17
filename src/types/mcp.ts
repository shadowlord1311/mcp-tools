import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Configuration for an MCP server
 */
export interface MCPServerConfig {
  /** Unique identifier for the server */
  name: string;
  /** Human-readable description */
  description: string;
  /** Version string */
  version: string;
  /** Whether the server is enabled */
  enabled: boolean;
}

/**
 * Base interface for MCP server implementations
 */
export interface MCPServerImplementation {
  /** Server configuration */
  config: MCPServerConfig;
  
  /** Initialize the server */
  initialize(): Promise<void>;
  
  /** Get available tools */
  getTools(): Promise<Tool[]>;
  
  /** Get available resources */
  getResources(): Promise<Resource[]>;
  
  /** Cleanup resources */
  cleanup(): Promise<void>;
}

/**
 * Platform-specific connection configuration
 */
export interface PlatformConfig {
  /** Platform type */
  type: 'github' | 'database' | 'testrail' | 'custom';
  /** Platform-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Application configuration
 */
export interface AppConfig {
  /** Enabled servers */
  servers: string[];
  /** Platform configurations */
  platforms: Record<string, PlatformConfig>;
  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
}

/**
 * MCP tool execution context
 */
export interface ToolContext {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
  /** Server instance */
  server: Server;
}