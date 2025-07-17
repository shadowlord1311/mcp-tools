import { BaseMCPServer } from '@/core/base-server.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { PlatformConfig } from '@/types/index.js';

/**
 * GitHub MCP Server implementation
 */
export class GitHubServer extends BaseMCPServer {
  private token: string;
  private baseUrl: string;

  constructor(platformConfig: PlatformConfig) {
    super({
      name: 'github',
      description: 'GitHub API integration for repositories, issues, and pull requests',
      version: '1.0.0',
      enabled: true,
    });

    const config = platformConfig.config;
    this.token = config.token as string;
    this.baseUrl = (config.baseUrl as string) || 'https://api.github.com';
  }

  async initialize(): Promise<void> {
    if (!this.token) {
      throw new Error('GitHub token is required');
    }
    
    // Test GitHub API connection
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'User-Agent': 'mcp-tools/1.0.0',
        },
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API test failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('GitHub server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GitHub server:', error);
      throw error;
    }
  }

  async getTools(): Promise<Tool[]> {
    return [
      {
        name: 'get_repository',
        description: 'Get information about a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            state: {
              type: 'string',
              enum: ['open', 'closed', 'all'],
              description: 'Issue state filter',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated list of labels to filter by',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            title: {
              type: 'string',
              description: 'Issue title',
            },
            body: {
              type: 'string',
              description: 'Issue body content',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Labels to apply to the issue',
            },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
    ];
  }

  async getResources(): Promise<Resource[]> {
    return [
      {
        uri: 'github://repositories',
        name: 'GitHub Repositories',
        description: 'List of accessible GitHub repositories',
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
        case 'get_repository':
          result = await this.getRepository(args.owner as string, args.repo as string);
          break;
        case 'list_issues':
          result = await this.listIssues(args);
          break;
        case 'create_issue':
          result = await this.createIssue(args);
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
    if (uri === 'github://repositories') {
      try {
        const response = await fetch(`${this.baseUrl}/user/repos`, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'User-Agent': 'mcp-tools/1.0.0',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch repositories: ${response.status}`);
        }

        const repos = await response.json();
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(repos, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error}`);
      }
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  private async getRepository(owner: string, repo: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': 'mcp-tools/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async listIssues(args: Record<string, unknown>): Promise<any> {
    const { owner, repo, state = 'open', labels } = args;
    const params = new URLSearchParams();
    
    params.set('state', state as string);
    if (labels) {
      params.set('labels', labels as string);
    }

    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': 'mcp-tools/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async createIssue(args: Record<string, unknown>): Promise<any> {
    const { owner, repo, title, body, labels } = args;
    
    const issueData: any = { title };
    if (body) {issueData.body = body;}
    if (labels) {issueData.labels = labels;}

    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': 'mcp-tools/1.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create issue: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async cleanup(): Promise<void> {
    // No specific cleanup needed for GitHub server
    console.log('GitHub server cleaned up');
  }
}