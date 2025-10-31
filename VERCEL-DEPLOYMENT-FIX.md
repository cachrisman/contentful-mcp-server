# Vercel Deployment - Quick Fix Guide

## Issue: "No Output Directory" Error

If you see: `Error: No Output Directory named "public" found after the Build completed`

This has been fixed in the latest configuration.

## Solution Applied

The configuration has been updated to work properly with Vercel's automatic TypeScript compilation:

### 1. Simplified `vercel.json`

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

- Removed `buildCommand` - Vercel auto-compiles TypeScript
- Removed `builds` and `routes` - Not needed for API routes
- Kept only function configuration

### 2. Updated `api/mcp.ts`

- Imports directly from `src/` directory
- Vercel's `@vercel/node` compiles TypeScript automatically
- No pre-build step required

### 3. Updated `.vercelignore`

- Excludes test files and build artifacts
- Includes `src/` directory (Vercel needs source files)

## Deployment Steps

### Fresh Deployment

```bash
# 1. Ensure dependencies are listed in package.json
# (Already done - @vercel/node is in devDependencies)

# 2. Deploy to Vercel
npx vercel

# 3. Follow prompts and deploy to production
npx vercel --prod
```

### If You Still Get Errors

#### Option 1: Use Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. **Framework Preset**: Select "Other"
5. **Build Command**: Leave empty (or `npm run build`)
6. **Output Directory**: Leave empty
7. **Install Command**: `npm install`
8. Click "Deploy"

#### Option 2: Clear Vercel Cache

```bash
# Remove existing Vercel configuration
rm -rf .vercel

# Redeploy
npx vercel --prod
```

#### Option 3: Manual Build Configuration

If automatic compilation fails, add to `vercel.json`:

```json
{
  "buildCommand": "npm install && npm run build",
  "functions": {
    "api/mcp.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

And update `api/mcp.ts` imports to use `build/` instead of `src/`:

```typescript
import { registerAllTools } from '../build/tools/register.js';
// etc...
```

## Verify Deployment

Once deployed, test with:

```bash
curl -X POST "https://YOUR-PROJECT.vercel.app/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/ping",
    "params": {
      "tenant": {
        "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "YOUR-TOKEN",
        "SPACE_ID": "YOUR-SPACE-ID"
      },
      "spaceId": "YOUR-SPACE-ID",
      "environmentId": "master"
    }
  }'
```

## Environment Variables (Production)

After deploying, set CORS origins:

```bash
npx vercel env add ALLOWED_ORIGINS production
# Enter: https://your-backend.com,https://app.contentful.com
```

## Troubleshooting

### TypeScript Compilation Errors

If Vercel shows TypeScript errors during build, they're likely from the contentful-management library types (pre-existing). The code runs correctly despite these type errors.

**Solutions**:

1. Add `"skipLibCheck": true` to `tsconfig.json`
2. Or deploy with: `vercel --prod --force`

### Function Timeout

If functions time out, increase in `vercel.json`:

```json
{
  "functions": {
    "api/mcp.ts": {
      "maxDuration": 300, // 5 minutes (Pro plan required)
      "memory": 1024
    }
  }
}
```

### Missing Dependencies

If you get "Cannot find module" errors:

```bash
# Ensure all dependencies are in package.json dependencies (not devDependencies)
npm install --save @modelcontextprotocol/sdk contentful-management zod
```

## Success Indicators

✅ Deployment completes without errors
✅ Function appears in Vercel dashboard under "Functions"
✅ Health check (`/api/mcp` with ping method) returns 200
✅ No console errors in Vercel function logs

## Need Help?

- [Vercel Docs - Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Docs - TypeScript](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#typescript)
- [GitHub Issues](https://github.com/contentful/contentful-mcp-server/issues)
