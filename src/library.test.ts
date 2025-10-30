import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMcpServer } from './library.js';
import { contextStore } from './tools/context/store.js';

vi.mock('./core/register.js', () => {
  return {
    registerAll: (_server: unknown, context: unknown) => {
      const tools = new Map<
        string,
        (args: unknown) => unknown | Promise<unknown>
      >();
      tools.set('whoami', async () => context);
      return {
        listTools: async () => [
          {
            name: 'whoami',
            description: 'Echo current context',
            jsonSchema: {},
          },
        ],
        getToolHandler: (name: string) => tools.get(name),
      };
    },
  };
});

describe('createMcpServer', () => {
  beforeEach(() => {
    contextStore.resetInitialContext();
  });

  it('isolates context per instance', async () => {
    const first = createMcpServer({
      token: 'token-1',
      spaceId: 'space-1',
      environmentId: 'env-1',
    });

    const second = createMcpServer({
      token: 'token-2',
      spaceId: 'space-2',
      environmentId: 'env-2',
    });

    const firstContext = (await first.callTool('whoami', {})) as Record<
      string,
      unknown
    >;
    const secondContext = (await second.callTool('whoami', {})) as Record<
      string,
      unknown
    >;

    expect(firstContext).not.toBe(secondContext);
    expect(firstContext).toMatchObject({
      spaceId: 'space-1',
      environmentId: 'env-1',
    });
    expect(secondContext).toMatchObject({
      spaceId: 'space-2',
      environmentId: 'env-2',
    });
  });

  it('invokes onStop callbacks and resets context store', async () => {
    const server = createMcpServer({
      token: 'token-3',
      spaceId: 'space-3',
      environmentId: 'env-3',
    });

    const onStop = vi.fn();
    server.onStop(onStop);

    contextStore.setInitialContextLoaded();
    expect(contextStore.hasInitialContext()).toBe(true);

    await server.stop();

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(contextStore.hasInitialContext()).toBe(false);
  });
});
