import { BaseMCPServer } from '@/core/base-server.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { PlatformConfig } from '@/types/index.js';

/**
 * TestRail MCP Server implementation
 */
export class TestRailServer extends BaseMCPServer {
  private baseUrl: string;
  private username: string;
  private password: string;

  constructor(platformConfig: PlatformConfig) {
    super({
      name: 'testrail',
      description: 'TestRail integration for test case and test run management',
      version: '1.0.0',
      enabled: true,
    });

    const config = platformConfig.config;
    this.baseUrl = config.baseUrl as string;
    this.username = config.username as string;
    this.password = config.password as string;
  }

  async initialize(): Promise<void> {
    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error('TestRail configuration is incomplete');
    }
    
    // Test TestRail API connection
    try {
      const response = await fetch(`${this.baseUrl}/index.php?/api/v2/get_projects`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`TestRail API test failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('TestRail server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TestRail server:', error);
      throw error;
    }
  }

  async getTools(): Promise<Tool[]> {
    return [
      {
        name: 'get_projects',
        description: 'Get all projects from TestRail',
        inputSchema: {
          type: 'object',
          properties: {
            is_completed: {
              type: 'boolean',
              description: 'Filter by completion status',
            },
          },
        },
      },
      {
        name: 'get_test_cases',
        description: 'Get test cases from a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID',
            },
            suite_id: {
              type: 'number',
              description: 'Test suite ID (optional)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_test_run',
        description: 'Create a new test run',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Project ID',
            },
            name: {
              type: 'string',
              description: 'Test run name',
            },
            description: {
              type: 'string',
              description: 'Test run description',
            },
            suite_id: {
              type: 'number',
              description: 'Test suite ID',
            },
          },
          required: ['project_id', 'name'],
        },
      },
      {
        name: 'add_test_result',
        description: 'Add a test result to a test run',
        inputSchema: {
          type: 'object',
          properties: {
            test_id: {
              type: 'number',
              description: 'Test ID',
            },
            status_id: {
              type: 'number',
              description: 'Status ID (1=Passed, 5=Failed, etc.)',
            },
            comment: {
              type: 'string',
              description: 'Test result comment',
            },
          },
          required: ['test_id', 'status_id'],
        },
      },
    ];
  }

  async getResources(): Promise<Resource[]> {
    return [
      {
        uri: 'testrail://projects',
        name: 'TestRail Projects',
        description: 'List of all TestRail projects',
        mimeType: 'application/json',
      },
      {
        uri: 'testrail://test_statuses',
        name: 'Test Statuses',
        description: 'Available test result statuses',
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
        case 'get_projects':
          result = await this.getProjects(args.is_completed as boolean);
          break;
        case 'get_test_cases':
          result = await this.getTestCases(args.project_id as number, args.suite_id as number);
          break;
        case 'create_test_run':
          result = await this.createTestRun(args);
          break;
        case 'add_test_result':
          result = await this.addTestResult(args);
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
        case 'testrail://projects':
          content = JSON.stringify(await this.getProjects(), null, 2);
          break;
        case 'testrail://test_statuses':
          content = JSON.stringify(await this.getTestStatuses(), null, 2);
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

  private async makeTestRailRequest(endpoint: string, method = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}/index.php?/api/v2/${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`TestRail API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getProjects(isCompleted?: boolean): Promise<any> {
    const endpoint = isCompleted !== undefined 
      ? `get_projects&is_completed=${isCompleted ? 1 : 0}`
      : 'get_projects';
    
    return this.makeTestRailRequest(endpoint);
  }

  private async getTestCases(projectId: number, suiteId?: number): Promise<any> {
    const endpoint = suiteId 
      ? `get_cases/${projectId}&suite_id=${suiteId}`
      : `get_cases/${projectId}`;
    
    return this.makeTestRailRequest(endpoint);
  }

  private async createTestRun(args: Record<string, unknown>): Promise<any> {
    const { project_id, name, description, suite_id } = args;
    
    const runData: any = { name };
    if (description) {runData.description = description;}
    if (suite_id) {runData.suite_id = suite_id;}

    return this.makeTestRailRequest(`add_run/${project_id}`, 'POST', runData);
  }

  private async addTestResult(args: Record<string, unknown>): Promise<any> {
    const { test_id, status_id, comment } = args;
    
    const resultData: any = { status_id };
    if (comment) {resultData.comment = comment;}

    return this.makeTestRailRequest(`add_result/${test_id}`, 'POST', resultData);
  }

  private async getTestStatuses(): Promise<any> {
    return this.makeTestRailRequest('get_statuses');
  }

  async cleanup(): Promise<void> {
    // No specific cleanup needed for TestRail server
    console.log('TestRail server cleaned up');
  }
}