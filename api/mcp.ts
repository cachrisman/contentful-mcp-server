/**
 * Vercel serverless function handler for MCP server.
 * This provides an HTTP/JSON-RPC interface for the MCP tools.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from '../src/tools/register.js';
import { registerAllPrompts } from '../src/prompts/register.js';
import { registerAllResources } from '../src/resources/register.js';
import { VERSION } from '../src/config/version.js';
import { logger, scrubSensitiveData } from '../src/utils/security.js';

const MCP_SERVER_NAME = '@contentful/mcp-server';

// Allowed origins for CORS (configure via environment variable)
const getAllowedOrigins = (): string[] => {
  const originsEnv = process.env.ALLOWED_ORIGINS || '';
  const origins = originsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Default to allowing localhost for development
  if (origins.length === 0) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  return origins;
};

/**
 * Sets CORS headers for the response
 */
function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin || '';
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Validates request content type
 */
function validateContentType(req: VercelRequest): boolean {
  const contentType = req.headers['content-type'] || '';
  return contentType.includes('application/json');
}

/**
 * Creates and initializes the MCP server
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: VERSION,
  });

  registerAllTools(server);
  registerAllPrompts(server);
  registerAllResources(server);

  return server;
}

/**
 * JSON-RPC error codes
 */
enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/**
 * Creates a JSON-RPC error response
 */
function createJsonRpcError(
  id: string | number | null,
  code: JsonRpcErrorCode,
  message: string,
  data?: unknown,
) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
  };
}

/**
 * Processes a JSON-RPC request through the MCP server
 */
async function processJsonRpcRequest(
  server: McpServer,
  request: {
    jsonrpc: string;
    id?: string | number;
    method: string;
    params?: unknown;
  },
): Promise<unknown> {
  try {
    // Validate JSON-RPC version
    if (request.jsonrpc !== '2.0') {
      return createJsonRpcError(
        request.id ?? null,
        JsonRpcErrorCode.InvalidRequest,
        'Invalid JSON-RPC version. Must be "2.0"',
      );
    }

    // Extract method parts (e.g., "tools/getEntry" -> ["tools", "getEntry"])
    const methodParts = request.method.split('/');

    if (methodParts.length !== 2) {
      return createJsonRpcError(
        request.id ?? null,
        JsonRpcErrorCode.MethodNotFound,
        `Invalid method format: ${request.method}`,
      );
    }

    const [category, toolName] = methodParts;

    // Handle different MCP method categories
    if (category === 'tools') {
      // Call tool through server's internal handler
      const result = await (server as any)._toolHandlers?.[toolName]?.(
        request.params || {},
      );

      if (!result) {
        return createJsonRpcError(
          request.id ?? null,
          JsonRpcErrorCode.MethodNotFound,
          `Tool not found: ${toolName}`,
        );
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    }

    // Handle other categories (prompts, resources) if needed
    return createJsonRpcError(
      request.id ?? null,
      JsonRpcErrorCode.MethodNotFound,
      `Unsupported method category: ${category}`,
    );
  } catch (error) {
    logger.error('Error processing JSON-RPC request:', { error });

    return createJsonRpcError(
      request.id ?? null,
      JsonRpcErrorCode.InternalError,
      error instanceof Error ? error.message : 'Internal server error',
    );
  }
}

/**
 * Main Vercel serverless function handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are accepted',
    });
    return;
  }

  // Validate content type
  if (!validateContentType(req)) {
    res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json',
    });
    return;
  }

  try {
    // Log request (with sensitive data scrubbed)
    logger.debug('Received request:', scrubSensitiveData({ body: req.body }));

    // Parse and validate JSON-RPC request
    const jsonRpcRequest = req.body;

    if (!jsonRpcRequest || typeof jsonRpcRequest !== 'object') {
      res
        .status(400)
        .json(
          createJsonRpcError(
            null,
            JsonRpcErrorCode.ParseError,
            'Invalid JSON-RPC request',
          ),
        );
      return;
    }

    // Create MCP server instance
    const server = createServer();

    // Process request
    const response = await processJsonRpcRequest(server, jsonRpcRequest);

    // Send response
    res.status(200).json(response);
  } catch (error) {
    logger.error('Unhandled error:', { error });

    res
      .status(500)
      .json(
        createJsonRpcError(
          null,
          JsonRpcErrorCode.InternalError,
          'Internal server error',
        ),
      );
  }
}
