# MCP Tools

A collection of MCP (Model Context Protocol) servers for various platform integrations, built with Bun and TypeScript.

## Overview

MCP Tools is a template repository for building enterprise-grade MCP server collections that can integrate with multiple external platforms while maintaining a clean, modular architecture. It provides a unified stdio interface for communication with MCP clients.

## Features

- **Multi-server Architecture**: Host multiple MCP servers in a single application
- **Platform Integrations**: Built-in support for GitHub, databases, and TestRail
- **Binary Compilation**: Compiles to a single binary executable via Bun
- **Stdio Interface**: Standard MCP stdio transport protocol
- **TypeScript**: Full type safety and modern development experience
- **Extensible**: Easy to add new platform integrations

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- Node.js >= 18 (for development tools)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-tools
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables (see [Configuration](#configuration))

4. Build the binary:
```bash
bun run build
```

5. Run the MCP server:
```bash
./mcp-tools
```

## Configuration

MCP Tools supports configuration through a YAML file, environment variables, or both (with environment variables taking precedence).

### YAML Configuration (Recommended)

Create a `mcpconfig.yml` file in your project root:

```yaml
# List of enabled servers
servers:
  - github
  - database
  - testrail

# Platform configurations
platforms:
  github:
    type: github
    config:
      token: "${GITHUB_TOKEN}"  # Can use environment variables
      baseUrl: "https://api.github.com"
  
  database:
    type: database
    config:
      connectionString: "${DATABASE_URL}"
      type: "postgresql"  # postgresql, mysql, sqlite
  
  testrail:
    type: testrail
    config:
      baseUrl: "${TESTRAIL_URL}"
      username: "${TESTRAIL_USERNAME}"
      password: "${TESTRAIL_PASSWORD}"

# Logging configuration
logging:
  level: "info"  # debug, info, warn, error
  format: "text"  # json, text
```

Copy the provided `mcpconfig.example.yml` as a starting point.

### Environment Variables

You can still configure servers via environment variables (these override YAML settings):

#### GitHub Server
```bash
export GITHUB_TOKEN="your_github_token"
export GITHUB_BASE_URL="https://api.github.com"  # optional
```

#### Database Server
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/database"
export DATABASE_TYPE="postgresql"  # postgresql, mysql, sqlite
```

#### TestRail Server
```bash
export TESTRAIL_URL="https://your-company.testrail.io"
export TESTRAIL_USERNAME="your_username"
export TESTRAIL_PASSWORD="your_password"
```

#### Global Settings
```bash
export MCP_SERVERS="github,database"  # Override enabled servers
export LOG_LEVEL="debug"  # debug, info, warn, error
export LOG_FORMAT="json"  # json, text
```

### Configuration Priority

Configuration is loaded in the following order (highest priority first):
1. Environment variables
2. `mcpconfig.yml` file
3. Built-in defaults

## Available Tools

### GitHub Server (`github/`)
- `get_repository` - Get repository information
- `list_issues` - List repository issues
- `create_issue` - Create new issues

### Database Server (`database/`)
- `execute_query` - Execute SQL queries
- `list_tables` - List database tables
- `describe_table` - Get table schema information

### TestRail Server (`testrail/`)
- `get_projects` - Get TestRail projects
- `get_test_cases` - Get test cases from projects
- `create_test_run` - Create new test runs
- `add_test_result` - Add test results

## Available Resources

### GitHub Server
- `github://repositories` - List of accessible repositories

### Database Server
- `database://tables` - List of database tables
- `database://schema` - Complete database schema

### TestRail Server
- `testrail://projects` - List of TestRail projects
- `testrail://test_statuses` - Available test result statuses

## Development

### Project Structure

```
src/
├── core/           # Core MCP framework
│   ├── base-server.ts      # Base server implementation
│   └── server-registry.ts  # Server management
├── servers/        # Platform integrations
│   ├── github.ts           # GitHub MCP server
│   ├── database.ts         # Database MCP server
│   └── testrail.ts         # TestRail MCP server
├── types/          # TypeScript type definitions
│   └── mcp.ts              # MCP-related types
├── utils/          # Utility functions
│   ├── config.ts           # Configuration management
│   └── logger.ts           # Logging utilities
└── index.ts        # Application entry point
```

### Development Commands

```bash
# Start development server with hot reload
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint
bun run lint:fix

# Code formatting
bun run format

# Build binary
bun run build

# Run tests
bun run test
```

### Adding New Servers

1. Create a new server file in `src/servers/`:

```typescript
import { BaseMCPServer } from '@/core/base-server.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { PlatformConfig } from '@/types/index.js';

export class MyCustomServer extends BaseMCPServer {
  constructor(platformConfig: PlatformConfig) {
    super({
      name: 'mycustom',
      description: 'My custom platform integration',
      version: '1.0.0',
      enabled: true,
    });
  }

  async initialize(): Promise<void> {
    // Initialize your platform connection
  }

  async getTools(): Promise<Tool[]> {
    // Return available tools
    return [];
  }

  async getResources(): Promise<Resource[]> {
    // Return available resources
    return [];
  }

  protected async handleToolCall(name: string, args: Record<string, unknown>) {
    // Handle tool execution
  }

  protected async handleResourceRead(uri: string) {
    // Handle resource reading
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}
```

2. Update the configuration in `src/utils/config.ts`
3. Register the server in `src/index.ts`
4. Export the server from `src/servers/index.ts`

## Deployment

### Binary Deployment

The application compiles to a single binary that can be deployed anywhere:

```bash
# Build the binary
bun run build

# Deploy the binary
./mcp-tools
```

### Container Deployment

Create a `Dockerfile`:

```dockerfile
FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN bun run build

FROM ubuntu:22.04
COPY --from=builder /app/mcp-tools /usr/local/bin/mcp-tools
CMD ["mcp-tools"]
```

## MCP Client Integration

To use with MCP clients, configure the stdio transport:

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "mcp-tools": {
      "command": "/path/to/mcp-tools",
      "env": {
        "GITHUB_TOKEN": "your_token",
        "DATABASE_URL": "your_db_url"
      }
    }
  }
}
```

### Python MCP Client

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="/path/to/mcp-tools",
        env={
            "GITHUB_TOKEN": "your_token",
            "DATABASE_URL": "your_db_url"
        }
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print(f"Available tools: {[tool.name for tool in tools.tools]}")
            
            # Call a tool
            result = await session.call_tool("github/get_repository", {
                "owner": "octocat",
                "repo": "Hello-World"
            })
            print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.