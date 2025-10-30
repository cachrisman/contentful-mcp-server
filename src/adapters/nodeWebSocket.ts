import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket.js';
import type {
  NodeWebSocketAdapterOptions,
  ServerInstance,
  ServerTransportLike,
  TransportDetach,
  WebSocketLike,
} from '../types.js';

function once<T extends (...args: unknown[]) => void>(fn: T): T {
  let called = false;
  return ((...args: Parameters<T>) => {
    if (called) return;
    called = true;
    fn(...args);
  }) as T;
}

type ListenerDisposer = () => void;

type SocketEvent = 'close' | 'error';

type SocketListener = (...args: unknown[]) => void;

function addSocketListener(
  socket: WebSocketLike,
  event: SocketEvent,
  listener: SocketListener,
): ListenerDisposer {
  if (typeof socket.on === 'function') {
    socket.on(event, listener);
    return () => {
      if (typeof socket.off === 'function') {
        socket.off(event, listener);
      } else if (typeof socket.removeListener === 'function') {
        socket.removeListener(event, listener);
      }
    };
  }

  if (typeof socket.addEventListener === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.addEventListener(event, listener as any);
    return () => {
      if (typeof socket.removeEventListener === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.removeEventListener(event, listener as any);
      }
    };
  }

  throw new Error('Provided WebSocket does not expose an event listener API');
}

function isSocketOpen(socket: WebSocketLike): boolean {
  const { readyState } = socket;
  if (typeof readyState !== 'number') return true;
  // 0 = CONNECTING, 1 = OPEN in both ws and WHATWG specs
  return readyState === 0 || readyState === 1;
}

export async function nodeWebSocketAdapter(
  server: ServerInstance,
  socket: WebSocketLike,
  options: NodeWebSocketAdapterOptions = {},
): Promise<TransportDetach> {
  const {
    autoStop = true,
    closeSocketOnDetach = true,
    logger,
    onClose,
    onError,
  } = options;

  const transport = new WebSocketServerTransport(socket as unknown as any);
  const trackedTransport = transport as ServerTransportLike;

  const listenerDisposers: ListenerDisposer[] = [];
  const disposeAllListeners = () => {
    while (listenerDisposers.length) {
      const dispose = listenerDisposers.pop();
      try {
        dispose?.();
      } catch (error) {
        logger?.warn('socket_listener_dispose_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  let detached = false;

  const cleanup = async ({
    closeTransport = true,
    closeSocket = closeSocketOnDetach,
  } = {}) => {
    if (detached) return;
    detached = true;
    disposeAllListeners();

    if (closeTransport && typeof trackedTransport.close === 'function') {
      try {
        await trackedTransport.close();
      } catch (error) {
        logger?.warn('transport_close_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (closeSocket && isSocketOpen(socket)) {
      try {
        socket.close();
      } catch (error) {
        logger?.warn('socket_close_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const handleClose = once(async (...args: unknown[]) => {
    await cleanup({ closeTransport: true, closeSocket: false });

    if (autoStop) {
      try {
        await server.stop();
      } catch (error) {
        logger?.warn('server_stop_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      onClose?.(args[0]);
    } catch (error) {
      logger?.warn('onClose_callback_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const handleError = once(async (errorEvent: unknown) => {
    logger?.error('websocket_error', {
      error:
        errorEvent instanceof Error
          ? errorEvent.message
          : errorEvent &&
              typeof errorEvent === 'object' &&
              'message' in (errorEvent as Record<string, unknown>)
            ? String((errorEvent as Record<string, unknown>).message)
            : String(errorEvent),
    });

    try {
      onError?.(errorEvent);
    } catch (callbackError) {
      logger?.warn('onError_callback_failed', {
        error:
          callbackError instanceof Error
            ? callbackError.message
            : String(callbackError),
      });
    }

    await cleanup();

    if (autoStop) {
      try {
        await server.stop();
      } catch (error) {
        logger?.warn('server_stop_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  listenerDisposers.push(addSocketListener(socket, 'close', handleClose));
  listenerDisposers.push(addSocketListener(socket, 'error', handleError));

  trackedTransport.dispose = async () => {
    await cleanup({ closeTransport: false });
  };

  await server.connect(trackedTransport);

  const detach: TransportDetach = async () => {
    await cleanup();
  };

  return detach;
}
