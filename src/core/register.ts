import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllPrompts } from '../prompts/register.js';
import { registerAllResources } from '../resources/register.js';
import { registerAllTools } from '../tools/register.js';
import type { Logger, McpServerContext, ToolMetadata } from '../types.js';
import { runWithContext } from './context.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodTypeAny } from 'zod';

function normalizeSchema(schema: unknown): Record<string, unknown> {
  if (isZodShape(schema)) {
    return zodShapeToJsonSchema(schema);
  }

  return (
    (schema as Record<string, unknown>) ?? { type: 'object', properties: {} }
  );
}

function isZodShape(value: unknown): value is Record<string, ZodTypeAny> {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(
    (entry) => typeof entry === 'object' && entry !== null && '_def' in entry,
  );
}

function zodShapeToJsonSchema(
  shape: Record<string, ZodTypeAny>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, schema] of Object.entries(shape)) {
    let current: ZodTypeAny | undefined = schema;
    let isOptional = false;

    // @ts-expect-error accessing internal Zod properties
    while (current && current._def?.typeName === 'ZodOptional') {
      // @ts-expect-error accessing internal Zod properties
      current = current._def?.innerType;
      isOptional = true;
    }

    // @ts-expect-error accessing internal Zod properties
    const typeName = current?._def?.typeName as string | undefined;

    let jsonProp: Record<string, unknown> = { type: 'string' };

    switch (typeName) {
      case 'ZodBoolean':
        jsonProp = { type: 'boolean' };
        break;
      case 'ZodNumber':
        jsonProp = { type: 'number' };
        break;
      case 'ZodArray':
        jsonProp = { type: 'array', items: { type: 'string' } };
        break;
      case 'ZodObject':
        jsonProp = { type: 'object' };
        break;
      case 'ZodString':
      default:
        jsonProp = { type: 'string' };
        break;
    }

    properties[key] = jsonProp;
    if (!isOptional) required.push(key);
  }

  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

export type ToolRecord = {
  name: string;
  description: string;
  jsonSchema: Record<string, unknown>;
  handler: (
    params: unknown,
    extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ) => Promise<unknown> | unknown;
};

export function registerAll(
  server: McpServer,
  context: McpServerContext,
  logger: Logger,
) {
  const tools: Map<string, ToolRecord> = new Map();

  const captureServer = Object.create(server) as McpServer;
  const originalTool = server.tool.bind(server);

  captureServer.tool = ((
    name: string,
    description: string,
    inputSchema: unknown,
    handler: (
      params: unknown,
      extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => Promise<unknown> | unknown,
  ) => {
    const normalizedSchema = normalizeSchema(inputSchema);
    const wrappedHandler = async (
      params: unknown,
      extra?: RequestHandlerExtra<ServerRequest, ServerNotification>,
    ) => runWithContext(context, () => handler(params, extra));

    tools.set(name, {
      name,
      description,
      jsonSchema: normalizedSchema,
      handler: wrappedHandler,
    });

    logger.debug('tool_registered', { name });

    return originalTool(
      name,
      description,
      inputSchema as Parameters<McpServer['tool']>[2],
      wrappedHandler as Parameters<McpServer['tool']>[3],
    );
  }) as McpServer['tool'];

  registerAllTools(captureServer);
  registerAllPrompts(captureServer);
  registerAllResources(captureServer);

  return {
    listTools: async (): Promise<ToolMetadata[]> =>
      Array.from(tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        jsonSchema: tool.jsonSchema,
      })),
    getToolHandler: (name: string) => tools.get(name)?.handler,
  };
}
