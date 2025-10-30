#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './library.js';
import { env } from './config/env.js';
import { VERSION } from './config/version.js';

if (process.env.NODE_ENV === 'development') {
  try {
    await import('mcps-logger/console');
  } catch {
    console.warn('mcps-logger not available in production environment');
  }
}

const MCP_SERVER_NAME = '@contentful/mcp-server';

function ensureEnv() {
  if (!env.success) {
    throw new Error(
      'Environment variables are not properly configured for CLI mode',
    );
  }

  const data = env.data!;

  if (!data.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN || !data.SPACE_ID) {
    throw new Error(
      'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN and SPACE_ID must be provided',
    );
  }

  return {
    token: data.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
    spaceId: data.SPACE_ID,
    environmentId: data.ENVIRONMENT_ID ?? 'master',
    host: data.CONTENTFUL_HOST,
  } as const;
}

async function main() {
  try {
    const options = ensureEnv();
    const server = createMcpServer(options);
    const transport = new StdioServerTransport();

    await server.connect(transport);
    console.log(`${MCP_SERVER_NAME} v${VERSION} is running over stdio.`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
