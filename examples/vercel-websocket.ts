import type { IncomingMessage } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { createMcpServer } from '@contentful/mcp-server';
import { nodeWebSocketAdapter } from '@contentful/mcp-server/adapters';

function resolveTenant(req: IncomingMessage): {
  token: string;
  spaceId: string;
  environmentId: string;
} {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const token =
    url.searchParams.get('token') ??
    process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  const spaceId = url.searchParams.get('spaceId') ?? process.env.SPACE_ID;
  const environmentId =
    url.searchParams.get('environmentId') ??
    process.env.ENVIRONMENT_ID ??
    'master';

  if (!token || !spaceId) {
    throw new Error(
      'Missing Contentful credentials for the WebSocket session.',
    );
  }

  return { token, spaceId, environmentId };
}

const wss = new WebSocketServer({ port: 0 });

wss.on('connection', async (socket: WebSocket, request) => {
  const tenant = resolveTenant(request);
  const server = createMcpServer(tenant);

  const detach = await nodeWebSocketAdapter(server, socket, {
    logger: tenant.spaceId
      ? {
          debug: () => undefined,
          info: (message, meta) =>
            console.log(`[${tenant.spaceId}] ${message}`, meta ?? {}),
          warn: (message, meta) =>
            console.warn(`[${tenant.spaceId}] ${message}`, meta ?? {}),
          error: (message, meta) =>
            console.error(`[${tenant.spaceId}] ${message}`, meta ?? {}),
        }
      : undefined,
    onError: (error) => console.error('WebSocket error', error),
  });

  socket.once('close', async () => {
    await server.stop();
  });

  server.onStop(detach);
});

console.log('WebSocket MCP server listening on', wss.address());
