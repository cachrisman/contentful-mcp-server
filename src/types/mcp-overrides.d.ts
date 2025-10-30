import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodTypeAny } from 'zod';

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  interface McpServer {
    tool(
      name: string,
      description: string,
      inputSchema: Record<string, unknown> | Record<string, ZodTypeAny>,
      handler: (
        args: Record<string, unknown>,
        extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => unknown | Promise<unknown>,
    ): RegisteredTool;
  }
}
