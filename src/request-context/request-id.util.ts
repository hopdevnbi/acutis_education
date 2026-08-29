import { randomUUID } from 'node:crypto';
import { REQUEST_ID_MAX_LENGTH, REQUEST_ID_PATTERN } from './request-context.types';

export function resolveRequestId(incomingRequestId: string | undefined): string {
  if (incomingRequestId === undefined) {
    return randomUUID();
  }

  const normalizedRequestId = incomingRequestId.trim();

  if (
    normalizedRequestId.length === 0 ||
    normalizedRequestId.length > REQUEST_ID_MAX_LENGTH ||
    !REQUEST_ID_PATTERN.test(normalizedRequestId)
  ) {
    return randomUUID();
  }

  return normalizedRequestId.toLowerCase();
}

export function readRequestIdFromRequest(request: {
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
  id?: unknown;
}): string {
  if (typeof request.requestId === 'string' && request.requestId.length > 0) {
    return request.requestId;
  }

  if (typeof request.id === 'string' && request.id.length > 0) {
    return request.id;
  }

  if (typeof request.id === 'number') {
    return String(request.id);
  }

  const headerValue = request.headers['x-request-id'];

  if (typeof headerValue === 'string') {
    return resolveRequestId(headerValue);
  }

  return randomUUID();
}
