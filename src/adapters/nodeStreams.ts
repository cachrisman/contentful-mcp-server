import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type {
  NodeStreamsAdapterOptions,
  ServerInstance,
  ServerTransportLike,
  TransportDetach,
} from '../types.js';

function createTransport(options: NodeStreamsAdapterOptions = {}) {
  if (options.stdin || options.stdout || options.stderr) {
    return new StdioServerTransport({
      stdin: options.stdin,
      stdout: options.stdout,
      stderr: options.stderr,
    });
  }

  return new StdioServerTransport();
}

export async function nodeStreamsAdapter(
  server: ServerInstance,
  options: NodeStreamsAdapterOptions = {},
): Promise<TransportDetach> {
  const transport = createTransport(options);
  const trackedTransport = transport as ServerTransportLike;

  trackedTransport.dispose = async () => {
    // No-op: stdio streams are managed externally and should not be closed automatically
  };

  await server.connect(trackedTransport);

  const detach: TransportDetach = async () => {
    if (typeof trackedTransport.close === 'function') {
      await trackedTransport.close();
    }
  };

  return detach;
}
