import { z } from 'zod';
import { outdent } from 'outdent';
import { contextStore } from './store.js';
import { withErrorHandling } from '../../utils/response.js';
import { MCP_INSTRUCTIONS } from './instructions.js';
import { getCurrentContext } from '../../core/context.js';

export const GetInitialContextToolParams = z.object({});

type Params = z.infer<typeof GetInitialContextToolParams>;

export function hasInitialContext(): boolean {
  return contextStore.hasInitialContext();
}

async function tool(_params: Params) {
  const context = getCurrentContext();

  const config = {
    space: context?.spaceId,
    environment: context?.environmentId,
    host: context?.host,
  };

  const configInfo = `Current Contentful Configuration:
  - Space ID: ${config.space ?? 'Not provided'}
  - Environment ID: ${config.environment ?? 'Not provided'}
  - API Host: ${config.host ?? 'api.contentful.com'}`;

  const todaysDate = new Date().toLocaleDateString('en-US');

  const message = outdent`
    ${MCP_INSTRUCTIONS}

    This is the initial context for your Contentful instance:

    <context>
      ${configInfo}
    </context>

    <todaysDate>${todaysDate}</todaysDate>
  `;

  contextStore.setInitialContextLoaded();

  return {
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
  };
}

export const getInitialContextTool = withErrorHandling(
  tool,
  'Error getting initial context',
);
