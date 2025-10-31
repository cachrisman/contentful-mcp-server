# Quick Start Guide - Multi-Tenant MCP Server

## 🚀 Deploy in 5 Minutes

### Step 1: Deploy to Vercel

```bash
# Clone/fork the repository
git clone https://github.com/contentful/contentful-mcp-server.git
cd contentful-mcp-server

# Install dependencies
npm install

# Deploy to Vercel
npx vercel

# Follow the prompts, then deploy to production
npx vercel --prod
```

### Step 2: Test Your Deployment

```bash
# Health check
curl -X POST "https://YOUR-PROJECT.vercel.app/mcp" \
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

### Step 3: Configure CORS (Production)

```bash
# Add your backend domain to allowed origins
npx vercel env add ALLOWED_ORIGINS production

# Enter: https://your-backend.com,https://app.contentful.com
```

✅ **Done!** Your multi-tenant MCP server is live.

## 📋 Request Format

Every request follows this structure:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/{TOOL_NAME}",
  "params": {
    "tenant": {
      "CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "CFPAT-xxx",
      "SPACE_ID": "space-id",
      "ENVIRONMENT_ID": "master", // Optional, default: "master"
      "CONTENTFUL_HOST": "api.contentful.com" // Optional, default: "api.contentful.com"
    },
    "spaceId": "space-id", // Required for all tools
    "environmentId": "master" // Required for all tools
    // ... tool-specific parameters
  }
}
```

## 🔧 Common Operations

### Get Entry

```bash
curl -X POST "YOUR-URL/mcp" -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/get_entry",
  "params": {
    "tenant": {"CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "TOKEN", "SPACE_ID": "SPACE"},
    "spaceId": "SPACE",
    "environmentId": "master",
    "entryId": "ENTRY-ID"
  }
}'
```

### Create Entry

```bash
curl -X POST "YOUR-URL/mcp" -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/create_entry",
  "params": {
    "tenant": {"CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "TOKEN", "SPACE_ID": "SPACE"},
    "spaceId": "SPACE",
    "environmentId": "master",
    "contentTypeId": "blogPost",
    "fields": {
      "title": {"en-US": "My Title"}
    }
  }
}'
```

### Search Entries

```bash
curl -X POST "YOUR-URL/mcp" -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/search_entries",
  "params": {
    "tenant": {"CONTENTFUL_MANAGEMENT_ACCESS_TOKEN": "TOKEN", "SPACE_ID": "SPACE"},
    "spaceId": "SPACE",
    "environmentId": "master",
    "query": {"content_type": "blogPost", "limit": 10}
  }
}'
```

## 💻 Backend Integration (Node.js)

```javascript
// Simple wrapper function
async function callMCP(toolName, params, tenantCreds) {
  const res = await fetch(process.env.MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: `tools/${toolName}`,
      params: {
        tenant: tenantCreds,
        ...params,
      },
    }),
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error.message);
  return result.result;
}

// Usage
const tenant = {
  CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: process.env.USER_TOKEN,
  SPACE_ID: process.env.USER_SPACE,
};

const entry = await callMCP(
  'get_entry',
  {
    spaceId: tenant.SPACE_ID,
    environmentId: 'master',
    entryId: '123',
  },
  tenant,
);
```

## 🐛 Troubleshooting

### Error: 415 Unsupported Media Type

**Fix**: Add header `Content-Type: application/json`

### Error: 401 Authentication Failed

**Fix**: Check your `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN` is valid

### Error: CORS blocked

**Fix**: Add your domain to `ALLOWED_ORIGINS` in Vercel

### Error: 429 Rate Limited

**Fix**: Server auto-retries. If persists, reduce request frequency.

## 📚 Available Tools

| Category          | Tools                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Health**        | `ping`                                                                                                                                                                                     |
| **Entries**       | `get_entry`, `create_entry`, `update_entry`, `delete_entry`, `publish_entry`, `unpublish_entry`, `search_entries`                                                                          |
| **Assets**        | `upload_asset`, `get_asset`, `list_assets`, `update_asset`, `publish_asset`, `unpublish_asset`, `delete_asset`                                                                             |
| **Content Types** | `list_content_types`, `get_content_type`, `create_content_type`, `update_content_type`, `publish_content_type`, `unpublish_content_type`, `delete_content_type`                            |
| **Spaces**        | `list_spaces`, `get_space`                                                                                                                                                                 |
| **Environments**  | `list_environments`, `create_environment`, `delete_environment`                                                                                                                            |
| **Locales**       | `list_locales`, `get_locale`, `create_locale`, `update_locale`, `delete_locale`                                                                                                            |
| **Tags**          | `list_tags`, `create_tag`                                                                                                                                                                  |
| **AI Actions**    | `create_ai_action`, `invoke_ai_action`, `get_ai_action`, `list_ai_actions`, `update_ai_action`, `publish_ai_action`, `unpublish_ai_action`, `delete_ai_action`, `get_ai_action_invocation` |
| **Organizations** | `list_orgs`, `get_org`                                                                                                                                                                     |
| **Taxonomies**    | Various concept scheme operations                                                                                                                                                          |

## 🔐 Security Checklist

- ✅ Never log tokens (auto-redacted)
- ✅ Use HTTPS (Vercel auto)
- ✅ Configure CORS (`ALLOWED_ORIGINS`)
- ✅ Rotate tokens regularly
- ✅ Monitor usage (Vercel Analytics)

## 📖 More Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Full deployment guide
- **[MULTI-TENANT-EXAMPLES.md](MULTI-TENANT-EXAMPLES.md)** - Detailed examples
- **[REFACTORING-SUMMARY.md](REFACTORING-SUMMARY.md)** - Technical details
- **[README.md](README.md)** - Main documentation

## 🆘 Need Help?

- **Issues**: [GitHub Issues](https://github.com/contentful/contentful-mcp-server/issues)
- **Discord**: [Contentful Community](https://www.contentful.com/discord/)
- **Docs**: [Contentful Docs](https://www.contentful.com/developers/docs/)

---

**Ready to go?** Run `npx vercel` to deploy now! 🚀
