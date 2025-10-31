# Multi-Tenant MCP Server - Usage Examples

This document provides practical examples for using the Contentful MCP Server in multi-tenant mode.

## Quick Start

### Example 1: Health Check (Ping)

Test your deployment and verify tenant credentials:

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-1",
    "method": "tools/ping",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-your-token-here",
        "SPACE_ID": "your-space-id",
        "ENVIRONMENT_ID": "master"
      },
      "spaceId": "your-space-id",
      "environmentId": "master"
    }
  }'
```

**Note**: Both `tenant` and `spaceId`/`environmentId` fields are shown for compatibility. The `spaceId`/`environmentId` at the top level override the tenant values if provided.

### Example 2: Get Entry

Retrieve a specific entry:

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-2",
    "method": "tools/get_entry",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-your-token-here",
        "SPACE_ID": "your-space-id"
      },
      "spaceId": "your-space-id",
      "environmentId": "master",
      "entryId": "your-entry-id"
    }
  }'
```

### Example 3: Search Entries

Search for entries with filters:

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-3",
    "method": "tools/search_entries",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-your-token-here",
        "SPACE_ID": "your-space-id"
      },
      "spaceId": "your-space-id",
      "environmentId": "master",
      "query": {
        "content_type": "blogPost",
        "limit": 10
      }
    }
  }'
```

### Example 4: Create Entry

Create a new entry:

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-4",
    "method": "tools/create_entry",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-your-token-here",
        "SPACE_ID": "your-space-id"
      },
      "spaceId": "your-space-id",
      "environmentId": "master",
      "contentTypeId": "blogPost",
      "fields": {
        "title": {
          "en-US": "My New Blog Post"
        },
        "body": {
          "en-US": "This is the content of my blog post."
        }
      }
    }
  }'
```

### Example 5: List Assets

List all assets in a space:

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-5",
    "method": "tools/list_assets",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-your-token-here",
        "SPACE_ID": "your-space-id"
      },
      "spaceId": "your-space-id",
      "environmentId": "master",
      "query": {
        "limit": 20
      }
    }
  }'
```

## Multi-Tenant Scenarios

### Scenario 1: Multiple Spaces, Same Token

Serve multiple Contentful spaces using the same management token:

```javascript
// Space A request
const spaceARequest = {
  jsonrpc: '2.0',
  id: 'space-a-1',
  method: 'tools/get_entry',
  params: {
    tenant: {
      CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'CFPAT-shared-token',
      SPACE_ID: 'space-a-id',
    },
    spaceId: 'space-a-id',
    environmentId: 'master',
    entryId: 'entry-123',
  },
};

// Space B request (same token, different space)
const spaceBRequest = {
  jsonrpc: '2.0',
  id: 'space-b-1',
  method: 'tools/get_entry',
  params: {
    tenant: {
      CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'CFPAT-shared-token',
      SPACE_ID: 'space-b-id',
    },
    spaceId: 'space-b-id',
    environmentId: 'production',
    entryId: 'entry-456',
  },
};
```

### Scenario 2: Different Tokens per Customer

Serve multiple customers with their own tokens:

```javascript
// Customer 1
const customer1Request = {
  jsonrpc: '2.0',
  id: 'customer1-1',
  method: 'tools/search_entries',
  params: {
    tenant: {
      CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'CFPAT-customer1-token',
      SPACE_ID: 'customer1-space',
    },
    spaceId: 'customer1-space',
    environmentId: 'master',
    query: {},
  },
};

// Customer 2
const customer2Request = {
  jsonrpc: '2.0',
  id: 'customer2-1',
  method: 'tools/search_entries',
  params: {
    tenant: {
      CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'CFPAT-customer2-token',
      SPACE_ID: 'customer2-space',
    },
    spaceId: 'customer2-space',
    environmentId: 'master',
    query: {},
  },
};
```

## Backend Integration Example (Node.js)

Example of calling the MCP server from a backend:

```javascript
import fetch from 'node-fetch';

async function callMCPTool(toolName, params, tenantCredentials) {
  const response = await fetch('https://your-server.vercel.app/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `request-${Date.now()}`,
      method: `tools/${toolName}`,
      params: {
        tenant: tenantCredentials,
        ...params,
      },
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`MCP Error: ${result.error.message}`);
  }

  return result.result;
}

// Example usage
async function getEntry(tenantCreds, entryId) {
  return await callMCPTool(
    'get_entry',
    {
      spaceId: tenantCreds.SPACE_ID,
      environmentId: tenantCreds.ENVIRONMENT_ID,
      entryId,
    },
    tenantCreds,
  );
}

// Call with tenant credentials
const tenantCreds = {
  CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: process.env.CONTENTFUL_TOKEN,
  SPACE_ID: process.env.SPACE_ID,
  ENVIRONMENT_ID: process.env.ENVIRONMENT_ID || 'master',
  CONTENTFUL_HOST: process.env.CONTENTFUL_HOST || 'api.contentful.com',
};

const entry = await getEntry(tenantCreds, 'my-entry-id');
console.log('Entry:', entry);
```

## Error Handling

### Example: Invalid Credentials

Request with invalid token:

```json
{
  "jsonrpc": "2.0",
  "id": "error-1",
  "error": {
    "code": -32603,
    "message": "Authentication failed: Invalid token. Please verify your CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is valid."
  }
}
```

### Example: Missing Required Field

Request missing `SPACE_ID`:

```json
{
  "jsonrpc": "2.0",
  "id": "error-2",
  "error": {
    "code": -32602,
    "message": "Invalid tenant credentials: SPACE_ID: Space ID is required"
  }
}
```

### Example: Rate Limited (Auto-Retry)

The server automatically retries rate-limited requests:

```json
{
  "jsonrpc": "2.0",
  "id": "retry-1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Entry retrieved successfully\n\nentry: {...}"
      }
    ]
  }
}
```

Rate-limited requests are retried up to 3 times with exponential backoff (100ms → 200ms → 400ms).

## Testing Your Deployment

### 1. Save Request to File

Create `test-request.json`:

```json
{
  "jsonrpc": "2.0",
  "id": "test",
  "method": "tools/ping",
  "params": {
    "tenant": {
      "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-your-token",
      "SPACE_ID": "your-space-id"
    },
    "spaceId": "your-space-id",
    "environmentId": "master"
  }
}
```

### 2. Send Request

```bash
curl -X POST "https://your-server.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

### 3. Check Response

Successful response:

```json
{
  "jsonrpc": "2.0",
  "id": "test",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Ping successful\n\nstatus: healthy\nversion: 1.6.2\nspace: {...}\nenvironment: master\ntimestamp: 2025-10-30T..."
      }
    ]
  }
}
```

## Security Best Practices

1. **Never log tokens**: The server automatically redacts tokens in logs
2. **Use HTTPS**: Vercel provides automatic HTTPS
3. **Configure CORS**: Set `ALLOWED_ORIGINS` environment variable
4. **Rotate tokens**: Regularly rotate Contentful access tokens
5. **Monitor usage**: Use Vercel Analytics to track function invocations
6. **Validate input**: The server validates all tenant credentials

## Troubleshooting

### Issue: 415 Unsupported Media Type

**Solution**: Add `Content-Type: application/json` header

### Issue: 401 Authentication Failed

**Solution**: Verify your `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN` is valid and has the correct permissions

### Issue: 429 Rate Limited

**Solution**: The server automatically retries. If it persists, reduce request frequency

### Issue: CORS Error

**Solution**: Add your domain to `ALLOWED_ORIGINS` environment variable in Vercel

## Available Tools

All tools from the standard MCP server are available, including:

- **Health**: `ping`
- **Entries**: `get_entry`, `create_entry`, `update_entry`, `delete_entry`, `publish_entry`, `unpublish_entry`, `search_entries`
- **Assets**: `upload_asset`, `get_asset`, `list_assets`, `update_asset`, `publish_asset`, `unpublish_asset`, `delete_asset`
- **Content Types**: `list_content_types`, `get_content_type`, `create_content_type`, `update_content_type`, `publish_content_type`, `unpublish_content_type`, `delete_content_type`
- **And many more...**

For a complete list, see the main [README.md](README.md).
