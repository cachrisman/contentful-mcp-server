# Contentful MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides AI assistants with comprehensive tools to interact with [Contentful](https://www.contentful.com/) APIs.

## 🚀 Example Use Cases

This MCP server provides a comprehensive set of tools for content management, allowing AI to help you create, edit, organize, and publish content directly within Contentful. Once configured, you can use natural language in your AI assistant of choice to manage and interact with your Contentful spaces, including:

- **Content Creation**: "Create a new blog post for our fall product launch"
- **Content Management**: "Update all product entries to include the new pricing structure"
- **Asset Organization**: "Upload and organize these marketing images by campaign"
- **Workflow Automation**: "Create an AI action that translates content to Spanish"
- **Content Modeling**: "Add a new field to the product content type for customer ratings"

## 🌐 Multi-Tenant Support

**NEW**: The MCP server now supports **multi-tenant, stateless operation** suitable for serverless deployments like Vercel. In this mode, each tool invocation accepts tenant-specific Contentful credentials, enabling a single deployment to serve multiple tenants securely.

See [Multi-Tenant Usage](#-multi-tenant-usage) and [Deployment Guide](DEPLOYMENT.md) for details.

## 📓 Table of Contents

- [⚙️ Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Configuration](#configuration)
- [🧩 Programmatic Usage](#-programmatic-usage)
  - [Node.js WebSocket or Serverless](#nodejs-websocket-or-serverless)
  - [Local stdio Development](#local-stdio-development)
- [🌐 Multi-Tenant Usage](#-multi-tenant-usage)
  - [Tenant Credentials](#tenant-credentials)
  - [Example Requests](#example-requests)
  - [Security Considerations](#security-considerations)
- [☁️ Deployment](#️-deployment)
- [🛠️ Available Tools](#️-available-tools)
- [🔍 Development](#-development)
  - [Testing with MCP Inspector](#testing-with-mcp-inspector)
  - [Linting](#linting)
- [📦 Releases](#-releases)
- [🤝 Contributing](#-contributing)
  - [Development Setup](#development-setup)
- [📚 Documentation](#-documentation)
- [❓ Help & Support](#-help--support)
- [📄 License and Notices](#-license-and-notices)
- [🛡️ Code of Conduct](#️-code-of-conduct)

## ⚙️ Getting started

### Prerequisites

- Node.js
- npm
- A Contentful account with a [Space ID](https://www.contentful.com/help/spaces/find-space-id/)
- [Contentful Management API personal access token](https://www.contentful.com/help/token-management/personal-access-tokens/)

### Installation

#### One-Click install

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=contentful-mcp&config=eyJjb21tYW5kIjoibnB4IC15IEBjb250ZW50ZnVsL21jcC1zZXJ2ZXIiLCJlbnYiOnsiQ09OVEVOVEZVTF9NQU5BR0VNRU5UX0FDQ0VTU19UT0tFTiI6InlvdXItQ01BLXRva2VuIiwiU1BBQ0VfSUQiOiJ5b3VyLXNwYWNlLWlkIiwiRU5WSVJPTk1FTlRfSUQiOiJtYXN0ZXIiLCJDT05URU5URlVMX0hPU1QiOiJhcGkuY29udGVudGZ1bC5jb20ifX0%3D)

_Note: This requires [Cursor](https://cursor.com/) to be installed. If the link doesn't work, try the manual installation below._

**Claude Desktop:**

Download the .dxt configuration file [here](https://github.com/contentful/contentful-mcp-server/releases) from the latest release and import it into Claude Desktop to automatically configure the MCP server with your environment variables.

#### Install from source

```bash
git clone https://github.com/contentful/contentful-mcp-server.git
cd contentful-mcp-server
npm install
npm run build
```

### Environment Variables

| Environment Variable                 | Required | Default Value        | Description                                          |
| ------------------------------------ | -------- | -------------------- | ---------------------------------------------------- |
| `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN` | ✅ Yes   | -                    | Your Contentful Management API personal access token |
| `SPACE_ID`                           | ✅ Yes   | -                    | Your Contentful Space ID                             |
| `ENVIRONMENT_ID`                     | ❌ No    | `master`             | Target environment within your space                 |
| `CONTENTFUL_HOST`                    | ❌ No    | `api.contentful.com` | Contentful API host                                  |
| `NODE_ENV`                           | ❌ No    | `production`         | Node Environment to run in                           |

### Configuration

Refer to the documentation for your AI tool of choice for how to configure MCP servers. For example, see the documentation for [Cursor](https://docs.cursor.com/context/mcp), [VS Code](https://code.visualstudio.com/docs/copilot/chat/mcp-servers), or [Claude Desktop](https://modelcontextprotocol.io/quickstart/user).

Below is a sample configuration:

```json
{
  "mcpServers": {
    "contentful-mcp": {
      "command": "npx",
      "args": ["-y", "@contentful/mcp-server"],
      "env": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "your-CMA-token",
        "SPACE_ID": "your-space-id",
        "ENVIRONMENT_ID": "master",
        "CONTENTFUL_HOST": "api.contentful.com"
      }
    }
  }
}
```

## 🧩 Programmatic Usage

`@contentful/mcp-server` can also be embedded as a TypeScript library. Each call to `createMcpServer` produces an isolated, multi-tenant instance that accepts Contentful credentials at runtime—perfect for serverless or multi-user gateways.

### Node.js WebSocket or Serverless

```ts
import { createMcpServer } from '@contentful/mcp-server';
import { nodeWebSocketAdapter } from '@contentful/mcp-server/adapters';

wss.on('connection', async (socket, request) => {
  const server = createMcpServer({
    token: lookupTenantToken(request),
    spaceId: lookupSpaceId(request),
    environmentId: lookupEnvironment(request),
  });

  const detach = await nodeWebSocketAdapter(server, socket, {
    onError: (error) => console.error('socket error', error),
  });

  socket.once('close', async () => {
    await server.stop();
  });

  server.onStop(detach);
});
```

Use this pattern inside a Vercel Function (or any Node serverless runtime) to spin up a brand-new MCP instance for each WebSocket session. See [`examples/vercel-websocket.ts`](./examples/vercel-websocket.ts) for a complete script.

### Local stdio Development

```ts
import { createMcpServer } from '@contentful/mcp-server';
import { nodeStreamsAdapter } from '@contentful/mcp-server/adapters';

async function main() {
  const server = createMcpServer({
    token: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN!,
    spaceId: process.env.SPACE_ID!,
    environmentId: process.env.ENVIRONMENT_ID ?? 'master',
  });

  await nodeStreamsAdapter(server, {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
```

The default logger automatically redacts sensitive values such as the CMA token. See [`examples/stdio.ts`](./examples/stdio.ts) for an end-to-end runnable sample.

## 🌐 Multi-Tenant Usage

The MCP server supports **multi-tenant mode** where each tool invocation carries its own Contentful credentials. This enables:

- ✅ **Stateless operation** suitable for serverless/edge deployments
- ✅ **Multiple tenants** using a single server instance
- ✅ **No global configuration** - credentials passed per request
- ✅ **Secure isolation** between different Contentful spaces

### Tenant Credentials

Every tool invocation must include a `tenant` object with these fields:

```typescript
{
  "tenant": {
    "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "string",  // Required: Your CMA token
    "SPACE_ID": "string",                            // Required: Your space ID
    "ENVIRONMENT_ID": "string",                      // Optional: defaults to "master"
    "CONTENTFUL_HOST": "string"                      // Optional: defaults to "api.contentful.com"
  }
}
```

### Example Requests

#### Using HTTP/JSON-RPC (Vercel deployment)

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/get_entry",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
        "SPACE_ID": "your-space-id",
        "ENVIRONMENT_ID": "master"
      },
      "entryId": "your-entry-id"
    }
  }'
```

#### Health Check

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "health",
    "method": "tools/ping",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
        "SPACE_ID": "your-space-id"
      }
    }
  }'
```

### Security Considerations

- **No token persistence**: Credentials are never stored or cached across requests
- **Automatic redaction**: Tokens are automatically redacted in logs (only last 4 chars shown)
- **Per-request validation**: Every request validates credentials independently
- **CORS protection**: Configure `ALLOWED_ORIGINS` environment variable
- **Rate limiting**: Built-in retry logic with exponential backoff for 429/5xx errors

### Error Handling

The server provides actionable error messages:

- **401 Unauthorized**: Invalid `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`
- **403 Forbidden**: Token lacks required permissions
- **404 Not Found**: Resource doesn't exist in the specified space/environment
- **429 Rate Limited**: Automatically retried with exponential backoff
- **5xx Server Errors**: Automatically retried (transient Contentful API issues)

## ☁️ Deployment

### Deploy to Vercel

The server is optimized for Vercel serverless deployment:

1. **Quick Deploy**: Click the button to deploy to Vercel

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/contentful/contentful-mcp-server)

2. **Manual Deploy**: See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions

3. **Configure CORS**: Set `ALLOWED_ORIGINS` environment variable in Vercel:
   ```
   ALLOWED_ORIGINS=https://your-backend.com,https://app.contentful.com
   ```

### Local Development (Single Tenant)

For local development with a single tenant, you can still use environment variables:

```bash
# .env
CONTENTFUL_MANAGEMENT_ACCESS_TOKEN=your-token
SPACE_ID=your-space-id
ENVIRONMENT_ID=master
CONTENTFUL_HOST=api.contentful.com
```

Then run via stdio transport:

```bash
npm install
npm run build
npm start
```

## 🛠️ Available Tools

| Category                  | Tool Name                  | Description                                      |
| ------------------------- | -------------------------- | ------------------------------------------------ |
| **Health & Monitoring**   | `ping`                     | Health check and credential verification         |
| **Context & Setup**       | `get_initial_context`      | Initialize connection and get usage instructions |
| **Content Types**         | `list_content_types`       | List all content types                           |
|                           | `get_content_type`         | Get detailed content type information            |
|                           | `create_content_type`      | Create new content types                         |
|                           | `update_content_type`      | Modify existing content types                    |
|                           | `publish_content_type`     | Publish content type changes                     |
|                           | `unpublish_content_type`   | Unpublish content types                          |
|                           | `delete_content_type`      | Remove content types                             |
| **Entries**               | `search_entries`           | Search and filter entries                        |
|                           | `get_entry`                | Retrieve specific entries                        |
|                           | `create_entry`             | Create new content entries                       |
|                           | `update_entry`             | Modify existing entries                          |
|                           | `publish_entry`            | Publish entries (single or bulk)                 |
|                           | `unpublish_entry`          | Unpublish entries (single or bulk)               |
|                           | `delete_entry`             | Remove entries                                   |
| **Assets**                | `upload_asset`             | Upload new assets                                |
|                           | `list_assets`              | List and browse assets                           |
|                           | `get_asset`                | Retrieve specific assets                         |
|                           | `update_asset`             | Modify asset metadata                            |
|                           | `publish_asset`            | Publish assets (single or bulk)                  |
|                           | `unpublish_asset`          | Unpublish assets (single or bulk)                |
|                           | `delete_asset`             | Remove assets                                    |
| **Spaces & Environments** | `list_spaces`              | List available spaces                            |
|                           | `get_space`                | Get space details                                |
|                           | `list_environments`        | List environments                                |
|                           | `create_environment`       | Create new environments                          |
|                           | `delete_environment`       | Remove environments                              |
| **Locales**               | `list_locales`             | List all locales in your environment             |
|                           | `get_locale`               | Retrieve specific locale information             |
|                           | `create_locale`            | Create new locales for multi-language content    |
|                           | `update_locale`            | Modify existing locale settings                  |
|                           | `delete_locale`            | Remove locales from environment                  |
| **Tags**                  | `list_tags`                | List all tags                                    |
|                           | `create_tag`               | Create new tags                                  |
| **AI Actions**            | `create_ai_action`         | Create custom AI-powered workflows               |
|                           | `invoke_ai_action`         | Invoke an AI action with variables               |
|                           | `get_ai_action_invocation` | Get AI action invocation details                 |
|                           | `get_ai_action`            | Retrieve AI action details and configuration     |
|                           | `list_ai_actions`          | List AI actions in a space                       |
|                           | `update_ai_action`         | Update existing AI actions                       |
|                           | `publish_ai_action`        | Publish AI actions for use                       |
|                           | `unpublish_ai_action`      | Unpublish AI actions                             |
|                           | `delete_ai_action`         | Remove AI actions                                |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for local development setup and contribution guidelines.

## 📦 Releases

This project uses [Nx Release](https://nx.dev/features/manage-releases) for automated versioning and publishing. Releases are automatically generated based on [Conventional Commits](https://www.conventionalcommits.org/). See [Contributing Guide](CONTRIBUTING.md) for more information on release process.

## 📚 Documentation

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Contentful Management API Documentation](https://www.contentful.com/developers/docs/references/content-management-api/)

## ❓ Help & Support

- [Contentful support resources](https://www.contentful.com/help/getting-started/how-to-get-help/)
- [Report bugs or request features](https://github.com/contentful/contentful-mcp-server/issues)
- [Contentful Community Discord](https://www.contentful.com/discord/)

## 📄 License and Notices

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

It also includes open-source components licensed under MIT, BSD-2-Clause, and Apache-2.0. For details, see the [NOTICE](./NOTICE) file.

This project includes an automated license management system that keeps track of all dependencies and their licenses. See the [AUTOMATION-FOR-LICENSES](./AUTOMATION-FOR-LICENSES.md) file for more information.

## 🛡️ Code of Conduct

We want to provide a safe, inclusive, welcoming, and harassment-free space and experience for all participants, regardless of gender identity and expression, sexual orientation, disability, physical appearance, socioeconomic status, body size, ethnicity, nationality, level of experience, age, religion (or lack thereof), or other identity markers.

[Read our full Code of Conduct](https://www.contentful.com/developers/code-of-conduct/).
