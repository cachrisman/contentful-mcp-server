# Multi-Tenant Refactoring Summary

## Overview

The Contentful MCP Server has been successfully refactored to support **multi-tenant, stateless operation** suitable for serverless deployments (Vercel, AWS Lambda, etc.). The refactoring maintains full backward compatibility with the existing single-tenant mode.

## What Changed

### 1. Core Multi-Tenant Infrastructure

#### New Files Created

- **`src/schema/tenant.ts`** - Zod schema for tenant credential validation
  - Validates required fields: `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`, `SPACE_ID`
  - Provides defaults: `ENVIRONMENT_ID='master'`, `CONTENTFUL_HOST='api.contentful.com'`
  - Includes validation helpers and TypeScript types

- **`src/lib/contentful.ts`** - Tenant-scoped client factory
  - `createTenantClient()` - Creates fresh client per request
  - No caching or state retention across requests
  - Fully stateless for serverless environments

- **`src/utils/errors.ts`** - Error handling and retry logic
  - Maps Contentful API errors to actionable messages
  - Implements exponential backoff retry (3 attempts max)
  - Retries on 429 (rate limit) and 5xx (server errors)
  - Clear error messages for 400, 401, 403, 404, 409, 422 errors

- **`src/utils/security.ts`** - Token redaction and secure logging
  - `redactToken()` - Shows only last 4 characters of tokens
  - `scrubSensitiveData()` - Recursively redacts sensitive fields
  - `createSafeLogger()` - Auto-redacting logger (disabled in production)

#### Modified Files

- **`src/utils/tools.ts`** - Updated to support multi-tenant mode
  - `BaseToolSchema` now includes optional `tenant` field
  - `createToolClient()` supports both multi-tenant and legacy modes
  - Backward compatible: works with environment variables if `tenant` not provided
  - Added `withContentfulRetry()` wrapper for automatic retries

### 2. Health Check & Monitoring

#### New Tool

- **`src/tools/health/ping.ts`** - Health check endpoint
  - Verifies tenant credentials
  - Tests Contentful API connectivity
  - Returns space info and server version
  - Useful for monitoring and alerting

### 3. Vercel Deployment Support

#### New Files

- **`vercel.json`** - Vercel deployment configuration
  - Routes traffic to `/mcp` endpoint
  - Configures serverless function timeout (60s) and memory (1GB)

- **`api/mcp.ts`** - Vercel serverless function handler
  - HTTP/JSON-RPC 2.0 endpoint
  - CORS support (configurable via `ALLOWED_ORIGINS` env var)
  - Validates `Content-Type: application/json`
  - Processes tool invocations
  - Auto-redacts sensitive data in logs

- **`.vercelignore`** - Excludes unnecessary files from deployment

#### Documentation

- **`DEPLOYMENT.md`** - Comprehensive deployment guide
  - Step-by-step Vercel deployment instructions
  - Environment variable configuration
  - CORS setup
  - Health check examples
  - Troubleshooting guide

- **`MULTI-TENANT-EXAMPLES.md`** - Usage examples
  - cURL examples for all common operations
  - Multi-tenant scenarios
  - Backend integration examples (Node.js)
  - Error handling examples

- **`README.md`** - Updated with multi-tenant section
  - Multi-tenant usage instructions
  - Security considerations
  - Error handling documentation
  - Deployment quick links

### 4. Comprehensive Tests

All new functionality is thoroughly tested:

- **`src/schema/tenant.test.ts`** (13 tests)
  - Validates tenant schema with valid/invalid inputs
  - Tests default value application
  - Tests validation error messages

- **`src/utils/security.test.ts`** (10 tests)
  - Tests token redaction
  - Tests nested object scrubbing
  - Tests various sensitive field patterns

- **`src/utils/errors.test.ts`** (19 tests)
  - Tests error mapping for all HTTP status codes
  - Tests retry logic with exponential backoff
  - Tests retryable vs non-retryable errors

- **`src/lib/contentful.test.ts`** (6 tests)
  - Tests client creation with tenant credentials
  - Tests stateless behavior (new instance per call)
  - Tests different tenant configurations

**Test Results**: All 247 tests passing ✓

## How Multi-Tenancy Works

### Architecture

```
┌─────────────────┐
│   AI Backend    │ (Your Vercel app)
│   (Chat UI)     │
└────────┬────────┘
         │
         │ HTTP/JSON-RPC
         │ (with tenant credentials)
         ▼
┌─────────────────────────────────────┐
│  MCP Server (Vercel Serverless)     │
│  ┌───────────────────────────────┐  │
│  │  1. Validate tenant creds     │  │
│  │  2. Create fresh client       │  │
│  │  3. Call Contentful API       │  │
│  │  4. Return result             │  │
│  └───────────────────────────────┘  │
└────────────┬────────────────────────┘
             │
             │ Contentful Management API
             ▼
┌─────────────────────────────────────┐
│       Contentful                    │
│  ┌──────────┐    ┌──────────┐      │
│  │ Space A  │    │ Space B  │      │
│  └──────────┘    └──────────┘      │
└─────────────────────────────────────┘
```

### Request Flow

1. **Client sends request** with tenant credentials:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/get_entry",
  "params": {
    "tenant": {
      "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
      "SPACE_ID": "space123",
      "ENVIRONMENT_ID": "master"
    },
    "entryId": "entry456"
  }
}
```

2. **Server validates** tenant credentials (Zod schema)
   - Required: `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`, `SPACE_ID`
   - Optional: `ENVIRONMENT_ID` (default: 'master'), `CONTENTFUL_HOST` (default: 'api.contentful.com')

3. **Server creates** fresh Contentful client
   - New instance per request (no caching)
   - Configured with tenant's token and host

4. **Server executes** tool operation
   - Automatic retry on 429/5xx errors
   - Error mapping to user-friendly messages

5. **Server returns** result
   - JSON-RPC 2.0 format
   - Tokens redacted in logs

## Backward Compatibility

The refactoring is **100% backward compatible**:

### Legacy Mode (Environment Variables)

Still works as before:

```bash
# .env
CONTENTFUL_MANAGEMENT_ACCESS_TOKEN=xxx
SPACE_ID=yyy
ENVIRONMENT_ID=master

# Run via stdio
npm start
```

Tools can be called without `tenant` parameter:

```javascript
{
  "method": "tools/get_entry",
  "params": {
    "spaceId": "space123",      // Uses env vars for token
    "environmentId": "master",
    "entryId": "entry456"
  }
}
```

### Multi-Tenant Mode (New)

New deployments can use tenant credentials:

```javascript
{
  "method": "tools/get_entry",
  "params": {
    "tenant": {
      "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
      "SPACE_ID": "space123"
    },
    "spaceId": "space123",
    "environmentId": "master",
    "entryId": "entry456"
  }
}
```

## Security Features

### 1. Token Redaction

All logs automatically redact sensitive information:

```javascript
// Input
{
  CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'CFPAT-1234567890abcdef';
}

// Logged as
{
  CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: '****cdef';
}
```

### 2. No Token Persistence

- Tokens are never cached or stored
- Fresh client created per request
- No state retained between requests

### 3. CORS Protection

Configure allowed origins:

```bash
# Vercel environment variable
ALLOWED_ORIGINS=https://your-app.com,https://app.contentful.com
```

### 4. Content-Type Validation

Only accepts `application/json`:

```bash
curl -H "Content-Type: application/json" ...  # ✓ Works
curl -H "Content-Type: text/plain" ...        # ✗ Rejected (415)
```

## Error Handling

### Automatic Retries

- **429 Rate Limited**: Retries up to 3 times with exponential backoff (100ms → 200ms → 400ms)
- **5xx Server Errors**: Same retry behavior
- **Other errors**: No retry (fail fast)

### Actionable Error Messages

| Status | Message                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------- |
| 400    | "Bad Request: {message}. Please check your input parameters."                                            |
| 401    | "Authentication failed: {message}. Please verify your CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is valid."      |
| 403    | "Permission denied: {message}. Your access token does not have sufficient permissions."                  |
| 404    | "Resource not found: {message}. Please verify the ID and that the resource exists in your space."        |
| 409    | "Conflict: {message}. The resource may have been modified by another request."                           |
| 422    | "Validation failed: {message}. Please check that all required fields are provided."                      |
| 429    | "Rate limit exceeded: {message}. Please wait a moment before retrying." (auto-retry)                     |
| 5xx    | "Contentful service error: {message}. This is a temporary issue with Contentful's servers." (auto-retry) |

## Deployment

### Quick Deploy to Vercel

1. **Fork/clone the repository**

2. **Connect to Vercel**:

   ```bash
   vercel
   ```

3. **Set environment variables** (optional):

   ```bash
   vercel env add ALLOWED_ORIGINS
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

Your MCP server is now live at `https://your-project.vercel.app/mcp`!

### Environment Variables

| Variable          | Required | Default                                       | Description                  |
| ----------------- | -------- | --------------------------------------------- | ---------------------------- |
| `ALLOWED_ORIGINS` | No       | `http://localhost:3000,http://localhost:3001` | Comma-separated CORS origins |
| `NODE_ENV`        | No       | `production`                                  | Node environment             |

**Note**: Do NOT set Contentful credentials as environment variables in multi-tenant mode. They are passed per-request.

## Testing

### All Tests Pass ✓

```bash
npm run test:run

# Results
Test Files  63 passed (63)
     Tests  247 passed (247)
```

### Test Coverage

- Tenant validation (13 tests)
- Security/redaction (10 tests)
- Error handling/retries (19 tests)
- Client factory (6 tests)
- All existing tool tests (199 tests)

## Migration Guide

### For Existing Deployments

No changes needed! Existing stdio-based deployments continue to work.

### For New Serverless Deployments

1. Deploy to Vercel (see Deployment section)
2. Update your backend to pass `tenant` in each request
3. Configure `ALLOWED_ORIGINS` for your domain
4. Test with the `/ping` endpoint

### For Agentic Chat Apps

Example integration:

```javascript
// In your chat backend (Vercel app)
async function callMCP(toolName, params, userSpaceId, userToken) {
  const response = await fetch(process.env.MCP_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: `tools/${toolName}`,
      params: {
        tenant: {
          CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: userToken,
          SPACE_ID: userSpaceId,
        },
        ...params,
      },
    }),
  });
  return response.json();
}

// Use in your AI agent
const entry = await callMCP(
  'get_entry',
  { entryId: '123', spaceId: user.spaceId, environmentId: 'master' },
  user.spaceId,
  user.contentfulToken,
);
```

## Benefits

### ✅ Multi-Tenancy

- Single deployment serves multiple customers
- Each request carries its own credentials
- Perfect isolation between tenants

### ✅ Stateless

- No global state or caching
- Survives serverless cold starts
- Scales horizontally

### ✅ Secure

- Tokens never logged or persisted
- CORS protection
- Input validation

### ✅ Robust

- Automatic retries on transient errors
- Clear error messages
- Exponential backoff

### ✅ Observable

- Structured logging
- Health check endpoint
- Vercel analytics integration

### ✅ Backward Compatible

- Existing deployments unaffected
- Gradual migration path
- Both modes work simultaneously

## Next Steps

1. ✅ Multi-tenant infrastructure - **Complete**
2. ✅ Error handling & retries - **Complete**
3. ✅ Security & logging - **Complete**
4. ✅ Vercel deployment - **Complete**
5. ✅ Documentation - **Complete**
6. ✅ Tests - **Complete** (247 passing)
7. 🔄 Deploy to production
8. 🔄 Monitor and iterate

## Files Modified/Created

### Created (18 files)

- `src/schema/tenant.ts`
- `src/schema/tenant.test.ts`
- `src/lib/contentful.ts`
- `src/lib/contentful.test.ts`
- `src/utils/errors.ts`
- `src/utils/errors.test.ts`
- `src/utils/security.ts`
- `src/utils/security.test.ts`
- `src/tools/health/ping.ts`
- `src/tools/health/register.ts`
- `api/mcp.ts`
- `vercel.json`
- `.vercelignore`
- `DEPLOYMENT.md`
- `MULTI-TENANT-EXAMPLES.md`
- `REFACTORING-SUMMARY.md` (this file)

### Modified (4 files)

- `src/utils/tools.ts` - Added multi-tenant support
- `src/tools/register.ts` - Added health tools
- `package.json` - Added @vercel/node
- `README.md` - Added multi-tenant section

## Conclusion

The Contentful MCP Server now supports **production-grade multi-tenancy** while maintaining **full backward compatibility**. It's ready for serverless deployment on Vercel and can power agentic chat applications that need to work with multiple Contentful spaces securely and efficiently.

The refactoring follows all requirements:

- ✅ Per-request credentials
- ✅ Stateless operation
- ✅ Vercel-friendly
- ✅ Secure (no token logging, CORS, validation)
- ✅ Robust (retries, error mapping)
- ✅ Well-tested (247 tests passing)
- ✅ Well-documented (3 new docs)
