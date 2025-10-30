type StatusLikeError = {
  status?: number;
  statusCode?: number;
  response?: {
    status?: number;
    statusText?: string;
  };
  sys?: {
    type?: string;
    id?: string;
  };
  name?: string;
};

export class ToolError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'ToolError';
    this.status = options?.status;
    this.details = options?.details;
  }
}

export type ContentfulRequestMeta = {
  action?: string;
  resource?: string;
  id?: string;
};

export function getStatusCode(error: unknown): number | undefined {
  const maybeStatus = error as StatusLikeError | undefined;
  return (
    maybeStatus?.response?.status ??
    maybeStatus?.status ??
    maybeStatus?.statusCode
  );
}

export function isRateLimitError(error: unknown): boolean {
  const status = getStatusCode(error);
  if (status === 429) {
    return true;
  }

  const name = (error as StatusLikeError | undefined)?.name;
  return name === 'RateLimitExceeded' || name === 'TooManyRequests';
}

export function isRetryableStatus(error: unknown): boolean {
  const status = getStatusCode(error);

  if (!status) {
    return false;
  }

  if (status === 429) {
    return true;
  }

  return status >= 500 && status < 600;
}

export function mapContentfulError(
  error: unknown,
  meta?: ContentfulRequestMeta,
): ToolError {
  const status = getStatusCode(error);
  const baseAction = meta?.action ? `${meta.action}` : 'perform Contentful operation';
  const resourceDetail = meta?.resource
    ? ` ${meta.resource}${meta?.id ? ` (${meta.id})` : ''}`
    : '';

  let message: string;

  switch (status) {
    case 401:
    case 403:
      message =
        `Authentication failed while attempting to ${baseAction}${resourceDetail}. ` +
        'Verify the management access token and its permissions for the target space/environment.';
      break;
    case 404:
      message =
        `Contentful resource not found when trying to ${baseAction}${resourceDetail}. ` +
        'Confirm the IDs and that the resource exists in the specified environment.';
      break;
    case 429:
      message =
        `Contentful rate limit exceeded during ${baseAction}${resourceDetail}. ` +
        'Please retry after a short delay.';
      break;
    default:
      if (typeof status === 'number' && status >= 500 && status < 600) {
        message =
          `Contentful service error (${status}) while attempting to ${baseAction}${resourceDetail}. ` +
          'Please retry later.';
      } else {
        const fallbackMessage =
          (error instanceof Error && error.message) ||
          'An unexpected error occurred while interacting with Contentful.';

        message = `${fallbackMessage}`;
      }
  }

  return new ToolError(message, { status, cause: error });
}

export function mapValidationError(error: unknown): ToolError {
  if (error instanceof ToolError) {
    return error;
  }

  if (error instanceof Error) {
    return new ToolError(error.message, { status: 400, cause: error });
  }

  return new ToolError('Invalid input received', {
    status: 400,
    cause: error,
  });
}

export function ensureToolError(error: unknown): ToolError {
  return error instanceof ToolError ? error : mapContentfulError(error);
}
