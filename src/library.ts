import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VERSION } from './config/version.js';
import type {
  CreateMcpServerOptions,
  Logger,
  McpServerContext,
  ServerInstance,
  ServerTransportLike,
} from './types.js';
import { registerAll } from './core/register.js';
import { runWithContext } from './core/context.js';
import { contextStore } from './tools/context/store.js';
import { createRedactingLogger } from './utils/logger.js';

function createContext(options: CreateMcpServerOptions): McpServerContext {
  const logger: Logger = createRedactingLogger([options.token], options.logger);

  return {
    accessToken: options.token,
    spaceId: options.spaceId,
    environmentId: options.environmentId,
    host: options.host ?? 'api.contentful.com',
    logger,
  };
}

export function createMcpServer(
  options: CreateMcpServerOptions,
): ServerInstance {
  const context = createContext(options);
  const server = new McpServer({
    name: '@contentful/mcp-server',
    version: VERSION,
  });

  contextStore.resetInitialContext();

  const { listTools, getToolHandler } = registerAll(
    server,
    context,
    context.logger,
  );
  const activeTransports = new Set<ServerTransportLike>();
  const stopCallbacks = new Set<() => Promise<void> | void>();

  return {
    connect: async (transport: ServerTransportLike) => {
      await runWithContext(context, () =>
        server.connect(transport as Parameters<McpServer['connect']>[0]),
      );

      if (
        transport &&
        (typeof transport.close === 'function' ||
          typeof transport.dispose === 'function')
      ) {
        const trackedTransport = transport;
        if (!activeTransports.has(trackedTransport)) {
          activeTransports.add(trackedTransport);
        }

        if (typeof trackedTransport.dispose === 'function') {
          const originalDispose =
            trackedTransport.dispose.bind(trackedTransport);
          trackedTransport.dispose = async () => {
            activeTransports.delete(trackedTransport);
            await originalDispose();
          };
        } else {
          stopCallbacks.add(() => {
            activeTransports.delete(trackedTransport);
          });
        }
      }
    },
    stop: async () => {
      await Promise.all(
        Array.from(activeTransports.values()).map(async (transport) => {
          try {
            if (typeof transport.close === 'function') {
              await transport.close();
            }
          } finally {
            if (typeof transport.dispose === 'function') {
              await transport.dispose();
            }
          }
        }),
      );
      activeTransports.clear();

      if (
        typeof (server as { close?: () => Promise<void> }).close === 'function'
      ) {
        await runWithContext(context, () =>
          (server as { close: () => Promise<void> }).close(),
        );
      }

      for (const callback of Array.from(stopCallbacks.values())) {
        try {
          await callback();
        } catch (error) {
          context.logger.warn('stop_callback_failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      stopCallbacks.clear();

      contextStore.resetInitialContext();
    },
    listTools,
    callTool: async (name: string, args: unknown) => {
      const handler = getToolHandler(name);
      if (!handler) {
        throw new Error(`Tool not found: ${name}`);
      }

      return await runWithContext(context, () => handler(args));
    },
    onStop: (callback: () => Promise<void> | void) => {
      stopCallbacks.add(callback);
      return () => stopCallbacks.delete(callback);
    },
  } satisfies ServerInstance;
}

export type {
  CreateMcpServerOptions,
  Logger,
  McpServerContext,
  ServerInstance,
  ServerTransportLike,
  ToolMetadata,
  WebSocketLike,
  NodeWebSocketAdapterOptions,
  NodeStreamsAdapterOptions,
  TransportDetach,
  TransportAdapter,
} from './types.js';
export { createRedactingLogger } from './utils/logger.js';
