export type Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type CreateMcpServerOptions = {
  token: string;
  spaceId: string;
  environmentId: string;
  host?: string;
  logger?: Logger;
};

export type McpServerContext = {
  accessToken: string;
  spaceId: string;
  environmentId: string;
  host?: string;
  logger: Logger;
};

export type ToolMetadata = {
  name: string;
  description: string;
  jsonSchema: Record<string, unknown>;
};

export type ServerTransportLike = {
  close?: () => Promise<void> | void;
  dispose?: () => Promise<void> | void;
};

export type WebSocketLike = {
  readyState: number;
  send: (data: string | ArrayBufferView | ArrayBufferLike) => void;
  close: (code?: number, reason?: string) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  once?: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  addEventListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  removeEventListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};

export type NodeWebSocketAdapterOptions = {
  autoStop?: boolean;
  closeSocketOnDetach?: boolean;
  logger?: Logger;
  onClose?: (event?: unknown) => void;
  onError?: (error: unknown) => void;
};

export type NodeStreamsAdapterOptions = {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
};

export type TransportDetach = () => Promise<void> | void;

export type TransportAdapter<Socket = unknown, Options = unknown> = (
  server: ServerInstance,
  socket: Socket,
  options?: Options,
) => Promise<TransportDetach>;

export type ServerInstance = {
  connect: (transport: ServerTransportLike) => Promise<void>;
  stop: () => Promise<void>;
  listTools: () => Promise<ToolMetadata[]>;
  callTool: (name: string, args: unknown) => Promise<unknown>;
  onStop: (callback: () => Promise<void> | void) => () => void;
};
