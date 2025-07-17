import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { MCPServerImplementation, AppConfig } from '@/types/index.js';

/**
 * Registry for managing multiple MCP servers
 */
export class MCPServerRegistry {
  private servers = new Map<string, MCPServerImplementation>();
  private mainServer: Server;

  constructor(private config: AppConfig) {
    this.mainServer = new Server({
      name: 'mcp-tools',
      version: '1.0.0',
    });

    this.setupMainServerHandlers();
  }

  /**
   * Register a new MCP server
   */
  public registerServer(server: MCPServerImplementation): void {
    if (!this.config.servers.includes(server.config.name)) {
      throw new Error(`Server ${server.config.name} is not enabled in configuration`);
    }

    if (!server.config.enabled) {
      console.warn(`Server ${server.config.name} is disabled, skipping registration`);
      return;
    }

    this.servers.set(server.config.name, server);
    console.log(`Registered MCP server: ${server.config.name}`);
  }

  /**
   * Initialize all registered servers
   */
  public async initializeAll(): Promise<void> {
    const initPromises = Array.from(this.servers.values()).map(async (server) => {
      try {
        await server.initialize();
        console.log(`Initialized server: ${server.config.name}`);
      } catch (error) {
        console.error(`Failed to initialize server ${server.config.name}:`, error);
        throw error;
      }
    });

    await Promise.all(initPromises);
  }

  /**
   * Start the main server with stdio transport
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mainServer.connect(transport);
    console.log('MCP Tools server started with stdio transport');
  }

  /**
   * Cleanup all servers
   */
  public async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.servers.values()).map(async (server) => {
      try {
        await server.cleanup();
        console.log(`Cleaned up server: ${server.config.name}`);
      } catch (error) {
        console.error(`Failed to cleanup server ${server.config.name}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Get all available tools from registered servers
   */
  private async getAllTools(): Promise<Array<{ server: string; tools: any[] }>> {
    const toolPromises = Array.from(this.servers.entries()).map(async ([name, server]) => {
      try {
        const tools = await server.getTools();
        return { server: name, tools };
      } catch (error) {
        console.error(`Failed to get tools from server ${name}:`, error);
        return { server: name, tools: [] };
      }
    });

    return Promise.all(toolPromises);
  }

  /**
   * Get all available resources from registered servers
   */
  private async getAllResources(): Promise<Array<{ server: string; resources: any[] }>> {
    const resourcePromises = Array.from(this.servers.entries()).map(async ([name, server]) => {
      try {
        const resources = await server.getResources();
        return { server: name, resources };
      } catch (error) {
        console.error(`Failed to get resources from server ${name}:`, error);
        return { server: name, resources: [] };
      }
    });

    return Promise.all(resourcePromises);
  }

  /**
   * Setup handlers for the main server
   */
  private setupMainServerHandlers(): void {
    // Aggregate tools from all servers
    this.mainServer.setRequestHandler(
      { method: 'tools/list' } as any,
      async () => {
        const serverTools = await this.getAllTools();
        const allTools = serverTools.flatMap(({ server, tools }) =>
          tools.map(tool => ({
            ...tool,
            name: `${server}/${tool.name}`, // Namespace tools by server
          }))
        );
        return { tools: allTools };
      }
    );

    // Aggregate resources from all servers
    this.mainServer.setRequestHandler(
      { method: 'resources/list' } as any,
      async () => {
        const serverResources = await this.getAllResources();
        const allResources = serverResources.flatMap(({ server, resources }) =>
          resources.map(resource => ({
            ...resource,
            uri: `${server}://${resource.uri}`, // Namespace resources by server
          }))
        );
        return { resources: allResources };
      }
    );

    // Route tool calls to appropriate server
    this.mainServer.setRequestHandler(
      { method: 'tools/call' } as any,
      async (request: any) => {
        const toolName = request.params.name;
        const [serverName, actualToolName] = toolName.split('/', 2);
        
        if (!serverName || !actualToolName) {
          throw new Error(`Invalid tool name format: ${toolName}. Expected: server/tool`);
        }

        const server = this.servers.get(serverName);
        if (!server) {
          throw new Error(`Server not found: ${serverName}`);
        }

        // Get the actual server instance and call the tool
        const serverInstance = (server as any).getServer?.() || server;
        const toolRequest = {
          method: 'tools/call',
          params: {
            name: actualToolName,
            arguments: request.params.arguments,
          },
        };

        return serverInstance.request(toolRequest);
      }
    );
  }
}