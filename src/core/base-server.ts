import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { MCPServerImplementation } from '@/types/index.js';

/**
 * Base MCP server class providing common functionality
 */
export abstract class BaseMCPServer implements MCPServerImplementation {
  protected server: Server;

  constructor(public config: MCPServerImplementation['config']) {
    this.server = new Server({
      name: config.name,
      version: config.version,
    });

    this.setupHandlers();
  }

  abstract initialize(): Promise<void>;
  abstract getTools(): ReturnType<MCPServerImplementation['getTools']>;
  abstract getResources(): ReturnType<MCPServerImplementation['getResources']>;
  abstract cleanup(): Promise<void>;

  /**
   * Get the underlying server instance
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * Set up common request handlers
   */
  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.getTools();
      return { tools };
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.getResources();
      return { resources };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.handleToolCall(request.params.name, request.params.arguments || {});
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.handleResourceRead(request.params.uri);
    });
  }

  /**
   * Handle tool execution - to be implemented by subclasses
   */
  protected abstract handleToolCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }>;

  /**
   * Handle resource reading - to be implemented by subclasses
   */
  protected abstract handleResourceRead(
    uri: string
  ): Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }>;
}