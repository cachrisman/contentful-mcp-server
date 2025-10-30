import { createMcpServer } from '@contentful/mcp-server';
import { nodeStreamsAdapter } from '@contentful/mcp-server/adapters';

type EnvConfig = {
  token: string;
  spaceId: string;
  environmentId: string;
  host?: string;
};

function readConfigFromEnv(): EnvConfig {
  const token = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  const spaceId = process.env.SPACE_ID;
  const environmentId = process.env.ENVIRONMENT_ID ?? 'master';

  if (!token || !spaceId) {
    throw new Error(
      'Set CONTENTFUL_MANAGEMENT_ACCESS_TOKEN and SPACE_ID before running the example.',
    );
  }

  return {
    token,
    spaceId,
    environmentId,
    host: process.env.CONTENTFUL_HOST,
  } satisfies EnvConfig;
}

async function main() {
  const config = readConfigFromEnv();
  const server = createMcpServer(config);

  await nodeStreamsAdapter(server, {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  });

  console.log('Contentful MCP server is now serving stdio requests.');
}

void main().catch((error) => {
  console.error('Failed to start MCP server over stdio', error);
  process.exit(1);
});
