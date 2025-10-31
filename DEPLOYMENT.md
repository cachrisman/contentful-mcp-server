# Deployment Guide for Contentful MCP Server

This guide covers deploying the Contentful MCP Server to Vercel for production use.

## Overview

The MCP server has been designed to be **multi-tenant** and **stateless**, making it suitable for serverless deployment on Vercel. Each tool invocation accepts tenant credentials, eliminating the need for global configuration.

## Architecture

- **Serverless Functions**: The server runs as a Vercel serverless function
- **HTTP/JSON-RPC**: Tools are invoked via HTTP POST requests with JSON-RPC 2.0 format
- **Stateless**: No persistent state between requests
- **Multi-tenant**: Each request carries its own Contentful credentials

## Prerequisites

1. A [Vercel account](https://vercel.com)
2. [Vercel CLI](https://vercel.com/docs/cli) installed (optional, for CLI deployment)
3. Your Contentful MCP Server repository

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):

```bash
npm install -g vercel
```

2. **Build the project**:

```bash
npm install
npm run build
```

3. **Deploy to Vercel**:

```bash
vercel
```

4. **Follow the prompts** to link your project and deploy.

5. **Deploy to production**:

```bash
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. **Push your code** to a Git repository (GitHub, GitLab, or Bitbucket)

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your repository

3. **Configure build settings**:
   - Framework Preset: **Other**
   - Build Command: Leave empty (Vercel auto-compiles TypeScript)
   - Output Directory: Leave empty
   - Install Command: `npm install`

4. **Configure environment variables** (optional):
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
   - `NODE_ENV`: Set to `production`

5. **Deploy** by clicking "Deploy"

## Configuration

### Environment Variables

Set these in your Vercel project settings:

| Variable          | Required | Default                                       | Description                                  |
| ----------------- | -------- | --------------------------------------------- | -------------------------------------------- |
| `ALLOWED_ORIGINS` | No       | `http://localhost:3000,http://localhost:3001` | Comma-separated list of allowed CORS origins |
| `NODE_ENV`        | No       | `production`                                  | Node environment                             |

**Important**: Do NOT set Contentful credentials as environment variables. Credentials are passed per-request in the `tenant` object.

### CORS Configuration

For security, configure `ALLOWED_ORIGINS` to include only your backend domain(s):

```bash
# Example
ALLOWED_ORIGINS=https://your-backend.vercel.app,https://app.contentful.com
```

For development, you can use:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Or allow all origins (⚠️ not recommended for production):

```bash
ALLOWED_ORIGINS=*
```

## API Endpoint

After deployment, your MCP server will be available at:

```
https://your-project.vercel.app/mcp
```

Or simply:

```
https://your-project.vercel.app
```

## Making Requests

### JSON-RPC Format

All tool invocations use JSON-RPC 2.0 format:

```bash
curl -X POST "https://your-project.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/ping",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
        "SPACE_ID": "your-space-id",
        "ENVIRONMENT_ID": "master",
        "CONTENTFUL_HOST": "api.contentful.com"
      }
    }
  }'
```

### Tenant Credentials

Every request MUST include a `tenant` object in the `params`:

```json
{
  "tenant": {
    "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx", // Required
    "SPACE_ID": "your-space-id", // Required
    "ENVIRONMENT_ID": "master", // Optional, defaults to "master"
    "CONTENTFUL_HOST": "api.contentful.com" // Optional, defaults to "api.contentful.com"
  }
}
```

### Example: Get Entry

```bash
curl -X POST "https://your-project.vercel.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tools/get_entry",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
        "SPACE_ID": "your-space-id"
      },
      "entryId": "entry-id-here"
    }
  }'
```

## Health Checks

Use the `ping` tool to verify deployment and tenant credentials:

```bash
curl -X POST "https://your-project.vercel.app/mcp" \
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

Successful response:

```json
{
  "jsonrpc": "2.0",
  "id": "health",
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

## Monitoring

### Vercel Logs

View function logs in your Vercel dashboard:

1. Go to your project
2. Click "Deployments"
3. Click on a deployment
4. Click "Functions" tab
5. Click on `api/mcp.ts`

### Health Monitoring

Set up a monitoring service (e.g., UptimeRobot, Pingdom) to periodically hit the `ping` endpoint.

## Security Best Practices

1. **Never log tokens**: The server automatically redacts sensitive fields in logs
2. **Use HTTPS**: Vercel provides automatic HTTPS
3. **Configure CORS**: Set `ALLOWED_ORIGINS` to specific domains
4. **Rotate tokens**: Regularly rotate Contentful access tokens
5. **Monitor usage**: Use Vercel Analytics to monitor function invocations
6. **Rate limiting**: Consider adding rate limiting at the application level

## Troubleshooting

### "No Output Directory" Error

If you see: `Error: No Output Directory named "public" found after the Build completed`

**Solution**: This has been fixed in the latest configuration. The deployment now uses automatic TypeScript compilation.

If you still encounter this:

1. Ensure your `vercel.json` contains only:

```json
{
  "functions": {
    "api/mcp.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

2. Clear Vercel cache and redeploy:

```bash
rm -rf .vercel
vercel --prod
```

3. See [VERCEL-DEPLOYMENT-FIX.md](VERCEL-DEPLOYMENT-FIX.md) for detailed troubleshooting.

### TypeScript Compilation Errors

If Vercel shows TypeScript errors during deployment, these are from pre-existing contentful-management library type definitions. The code runs correctly despite these type warnings.

**Solution**: Proceed with deployment - the functions work correctly at runtime.

### 415 Unsupported Media Type

- Ensure you're sending `Content-Type: application/json`

### 401 Authentication Failed

- Verify your `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN` is valid
- Check token permissions in Contentful

### 403 Permission Denied

- Verify the token has sufficient permissions for the operation

### 429 Rate Limited

- The server automatically retries with exponential backoff
- Consider implementing client-side rate limiting

### 500 Internal Server Error

- Check Vercel function logs for details
- Verify all required fields are provided

## Function Configuration

The Vercel configuration in `vercel.json`:

```json
{
  "functions": {
    "api/mcp.ts": {
      "maxDuration": 60, // 60 seconds timeout
      "memory": 1024 // 1GB memory
    }
  }
}
```

Adjust these based on your needs and Vercel plan limits.

## Cost Considerations

- **Vercel Pro**: Recommended for production use
- **Function Executions**: Monitor your function execution count
- **Bandwidth**: Monitor data transfer
- **Function Duration**: Optimize long-running operations

## Next Steps

1. Deploy to production
2. Configure CORS with your backend domains
3. Set up health monitoring
4. Test with your backend application
5. Monitor usage and performance

## Support

For issues specific to deployment:

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

For issues with the MCP server:

- [GitHub Issues](https://github.com/contentful/contentful-mcp-server/issues)
