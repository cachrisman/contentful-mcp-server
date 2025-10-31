import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { pingTool, PingToolParams } from './ping.js';

export function registerHealthTools(server: McpServer) {
  server.tool(
    'ping',
    'Health check endpoint to verify tenant credentials and Contentful API connectivity. Returns space information and server version.',
    PingToolParams.shape,
    pingTool,
  );
}
