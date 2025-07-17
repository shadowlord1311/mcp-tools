# Adding Custom Servers

This guide explains how to extend MCP Tools by adding your own custom server implementations.

## Overview

MCP Tools uses a modular architecture that makes it easy to add new platform integrations. Each server is a self-contained module that implements the MCP protocol for a specific platform or service.

## Server Architecture

All servers extend the `BaseMCPServer` class, which provides:

- Common MCP protocol handling
- Request routing
- Error handling
- Lifecycle management

## Creating a New Server

### Step 1: Create the Server File

Create a new file in `src/servers/` for your server:

```typescript
// src/servers/my-platform.ts
import { BaseMCPServer } from '@/core/base-server.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { PlatformConfig } from '@/types/index.js';

export class MyPlatformServer extends BaseMCPServer {
  private apiKey: string;
  private baseUrl: string;

  constructor(platformConfig: PlatformConfig) {
    super({
      name: 'myplatform',
      description: 'Integration with My Platform API',
      version: '1.0.0',
      enabled: true,
    });

    const config = platformConfig.config;
    this.apiKey = config.apiKey as string;
    this.baseUrl = (config.baseUrl as string) || 'https://api.myplatform.com';
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('API key is required for My Platform');
    }
    
    // Test API connection
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API test failed: ${response.status}`);
      }
      
      console.log('My Platform server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize My Platform server:', error);
      throw error;
    }
  }

  async getTools(): Promise<Tool[]> {
    return [
      {
        name: 'get_user',
        description: 'Get user information',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to retrieve',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new project',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name',
            },
            description: {
              type: 'string',
              description: 'Project description',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  async getResources(): Promise<Resource[]> {
    return [
      {
        uri: 'myplatform://users',
        name: 'Platform Users',
        description: 'List of platform users',
        mimeType: 'application/json',
      },
      {
        uri: 'myplatform://projects',
        name: 'Platform Projects',
        description: 'List of platform projects',
        mimeType: 'application/json',
      },
    ];
  }

  protected async handleToolCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let result: any;

      switch (name) {
        case 'get_user':
          result = await this.getUser(args.userId as string);
          break;
        case 'create_project':
          result = await this.createProject(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  protected async handleResourceRead(
    uri: string
  ): Promise<{ contents: Array<{ uri: string; mimeType?: string; text?: string }> }> {
    try {
      let content: string;

      switch (uri) {
        case 'myplatform://users':
          content = JSON.stringify(await this.getUsers(), null, 2);
          break;
        case 'myplatform://projects':
          content = JSON.stringify(await this.getProjects(), null, 2);
          break;
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error}`);
    }
  }

  // Private helper methods
  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getUser(userId: string): Promise<any> {
    return this.makeApiRequest(`users/${userId}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<any> {
    const { name, description } = args;
    return this.makeApiRequest('projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  private async getUsers(): Promise<any> {
    return this.makeApiRequest('users');
  }

  private async getProjects(): Promise<any> {
    return this.makeApiRequest('projects');
  }

  async cleanup(): Promise<void> {
    // Cleanup any resources (connections, timers, etc.)
    console.log('My Platform server cleaned up');
  }
}
```

### Step 2: Update Configuration

Add your platform configuration to `src/utils/config.ts`:

```typescript
export const defaultConfig: AppConfig = {
  servers: ['github', 'database', 'testrail', 'myplatform'], // Add your server
  platforms: {
    // ... existing platforms
    myplatform: {
      type: 'custom',
      config: {
        apiKey: process.env.MYPLATFORM_API_KEY || '',
        baseUrl: process.env.MYPLATFORM_BASE_URL || 'https://api.myplatform.com',
      },
    },
  },
  // ... rest of config
};
```

Add validation for your platform:

```typescript
export function validateConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  
  // ... existing validations
  
  // Validate My Platform configuration
  if (config.servers.includes('myplatform')) {
    const platformConfig = config.platforms.myplatform?.config;
    if (!platformConfig?.apiKey) {
      errors.push('My Platform server enabled but MYPLATFORM_API_KEY not provided');
    }
  }
  
  return errors;
}
```

### Step 3: Register the Server

Export your server from `src/servers/index.ts`:

```typescript
// Export all server implementations
export * from './github.js';
export * from './database.js';
export * from './testrail.js';
export * from './my-platform.js'; // Add this line
```

Register the server in `src/index.ts`:

```typescript
import { 
  GitHubServer, 
  DatabaseServer, 
  TestRailServer,
  MyPlatformServer // Add this import
} from '@/servers/index.js';

async function main(): Promise<void> {
  // ... existing code
  
  // Register enabled servers
  if (config.servers.includes('github')) {
    const githubServer = new GitHubServer(config.platforms.github!);
    registry.registerServer(githubServer);
  }

  // ... other servers

  if (config.servers.includes('myplatform')) {
    const myplatformServer = new MyPlatformServer(config.platforms.myplatform!);
    registry.registerServer(myplatformServer);
  }

  // ... rest of main function
}
```

### Step 4: Add Environment Variables

Set up environment variables for your platform:

```bash
export MYPLATFORM_API_KEY="your_api_key_here"
export MYPLATFORM_BASE_URL="https://api.myplatform.com"  # Optional
```

### Step 5: Test Your Server

1. Build the application:
   ```bash
   bun run build
   ```

2. Test with your new server:
   ```bash
   MCP_SERVERS="myplatform" ./mcp-tools
   ```

## Best Practices

### Error Handling

Always wrap API calls in try-catch blocks and provide meaningful error messages:

```typescript
try {
  const result = await this.makeApiRequest('endpoint');
  return result;
} catch (error) {
  console.error(`Failed to call endpoint:`, error);
  throw new Error(`API call failed: ${error instanceof Error ? error.message : String(error)}`);
}
```

### Configuration Validation

Validate all required configuration in the `initialize()` method:

```typescript
async initialize(): Promise<void> {
  if (!this.apiKey) {
    throw new Error('API key is required');
  }
  
  if (!this.baseUrl) {
    throw new Error('Base URL is required');
  }
  
  // Test connection
  await this.testConnection();
}
```

### Resource Management

Clean up resources in the `cleanup()` method:

```typescript
async cleanup(): Promise<void> {
  // Close connections
  if (this.connection) {
    await this.connection.close();
  }
  
  // Clear timers
  if (this.refreshTimer) {
    clearInterval(this.refreshTimer);
  }
  
  console.log('Platform server cleaned up');
}
```

### Tool Schema Design

Design clear, well-documented tool schemas:

```typescript
{
  name: 'descriptive_tool_name',
  description: 'Clear description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      requiredParam: {
        type: 'string',
        description: 'Description of what this parameter does',
      },
      optionalParam: {
        type: 'string',
        description: 'Optional parameter with default behavior',
      },
    },
    required: ['requiredParam'],
  },
}
```

### Type Safety

Use proper TypeScript types for better development experience:

```typescript
interface MyPlatformUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface MyPlatformProject {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
}

private async getUser(userId: string): Promise<MyPlatformUser> {
  return this.makeApiRequest(`users/${userId}`);
}
```

## Testing Your Server

### Unit Testing

Create tests for your server implementation:

```typescript
// tests/servers/my-platform.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MyPlatformServer } from '@/servers/my-platform.js';

describe('MyPlatformServer', () => {
  let server: MyPlatformServer;
  
  beforeEach(() => {
    server = new MyPlatformServer({
      type: 'custom',
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://test.api.com',
      },
    });
  });

  it('should initialize successfully with valid config', async () => {
    // Mock fetch
    global.fetch = mock(() => 
      Promise.resolve(new Response('OK', { status: 200 }))
    );
    
    await expect(server.initialize()).resolves.not.toThrow();
  });

  it('should return correct tools', async () => {
    const tools = await server.getTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('get_user');
  });
});
```

### Integration Testing

Test the server with actual MCP protocol:

```typescript
// tests/integration/my-platform.test.ts
import { MyPlatformServer } from '@/servers/my-platform.js';

describe('MyPlatform Integration', () => {
  it('should handle tool calls correctly', async () => {
    const server = new MyPlatformServer(validConfig);
    await server.initialize();
    
    const result = await server.handleToolCall('get_user', { userId: '123' });
    expect(result.content[0].type).toBe('text');
    // Parse and validate the JSON response
    const response = JSON.parse(result.content[0].text);
    expect(response.id).toBe('123');
  });
});
```

## Documentation

Document your server in the main README.md and create specific documentation for complex integrations. Include:

- Required environment variables
- Available tools and their parameters
- Available resources
- Example usage
- Troubleshooting guide

## Common Patterns

### Authentication

Most APIs require authentication. Common patterns:

```typescript
// Bearer token
headers: {
  'Authorization': `Bearer ${this.token}`,
}

// Basic auth
headers: {
  'Authorization': `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
}

// API key
headers: {
  'X-API-Key': this.apiKey,
}
```

### Pagination

Handle paginated responses:

```typescript
private async getAllItems(endpoint: string): Promise<any[]> {
  let allItems: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await this.makeApiRequest(`${endpoint}?page=${page}`);
    allItems.push(...response.items);
    hasMore = response.hasMore;
    page++;
  }
  
  return allItems;
}
```

### Rate Limiting

Implement rate limiting to avoid API limits:

```typescript
private lastRequestTime = 0;
private readonly minRequestInterval = 100; // ms

private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - this.lastRequestTime;
  if (timeSinceLastRequest < this.minRequestInterval) {
    await new Promise(resolve => 
      setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
    );
  }
  this.lastRequestTime = Date.now();
  
  // Make request
  return fetch(/* ... */);
}
```