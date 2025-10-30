import { AsyncLocalStorage } from 'node:async_hooks';
import type { McpServerContext } from '../types.js';

const storage = new AsyncLocalStorage<McpServerContext>();

export function runWithContext<T>(
  context: McpServerContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}

export function getCurrentContext(): McpServerContext | undefined {
  return storage.getStore();
}
