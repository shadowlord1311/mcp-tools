# Getting Started with MCP Tools

This guide will help you get MCP Tools up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Bun**: Download and install from [bun.sh](https://bun.sh/)
- **Git**: For cloning the repository
- **Platform Access**: Credentials for the platforms you want to integrate

## Step 1: Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd mcp-tools
```

2. Install dependencies:
```bash
bun install
```

## Step 2: Configuration

### Environment Variables

Create a `.env` file in the project root and configure your platform credentials:

```env
# GitHub Integration
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Database Integration
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# TestRail Integration
TESTRAIL_URL=https://your-company.testrail.io
TESTRAIL_USERNAME=your_username
TESTRAIL_PASSWORD=your_password

# Optional: Server Selection (default: all servers)
MCP_SERVERS=github,database,testrail

# Optional: Logging Level (default: info)
LOG_LEVEL=info
```

### Platform Setup

#### GitHub
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with appropriate scopes:
   - `repo` - Full repository access
   - `read:user` - Read user profile data
   - `read:org` - Read organization data (if needed)

#### Database
Ensure your database is accessible and you have the correct connection string format:
- **PostgreSQL**: `postgresql://user:password@host:port/database`
- **MySQL**: `mysql://user:password@host:port/database`
- **SQLite**: `sqlite:///path/to/database.db`

#### TestRail
1. Ensure you have a TestRail account with API access
2. Note your TestRail URL (e.g., `https://company.testrail.io`)
3. Use your TestRail username and password for authentication

## Step 3: Development

### Run in Development Mode

Start the development server with hot reload:

```bash
bun run dev
```

This will start the MCP server and watch for file changes.

### Build for Production

Create a binary executable:

```bash
bun run build
```

This creates a `mcp-tools` binary in the project root.

## Step 4: Testing

### Manual Testing

Test the server manually by providing JSON-RPC requests via stdin:

```bash
# Start the server
./mcp-tools

# In another terminal, send a request
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | ./mcp-tools
```

### Integration Testing

Test with an MCP client library or tool that supports the stdio transport.

## Step 5: MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-tools": {
      "command": "/full/path/to/mcp-tools",
      "env": {
        "GITHUB_TOKEN": "your_token",
        "DATABASE_URL": "your_db_url",
        "TESTRAIL_URL": "your_testrail_url",
        "TESTRAIL_USERNAME": "your_username",
        "TESTRAIL_PASSWORD": "your_password"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the binary is executable:
   ```bash
   chmod +x mcp-tools
   ```

2. **Missing Dependencies**: Reinstall dependencies:
   ```bash
   rm -rf node_modules bun.lock
   bun install
   ```

3. **Configuration Errors**: Check that all required environment variables are set and valid.

4. **Platform Connection Issues**: 
   - Verify credentials are correct
   - Check network connectivity
   - Ensure platform APIs are accessible

### Debug Mode

Enable debug logging for troubleshooting:

```bash
LOG_LEVEL=debug ./mcp-tools
```

### Build Issues

If you encounter build issues:

1. Check TypeScript compilation:
   ```bash
   bun run type-check
   ```

2. Run linting:
   ```bash
   bun run lint
   ```

3. Clean and rebuild:
   ```bash
   rm mcp-tools
   bun run build
   ```

## Next Steps

- Read the [API Documentation](api.md) to understand available tools and resources
- Learn about [Adding Custom Servers](custom-servers.md)
- Explore [Deployment Options](deployment.md)
- Check out [Examples](examples.md) for common use cases