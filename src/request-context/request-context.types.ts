export const REQUEST_ID_HEADER = 'x-request-id' as const;

export const REQUEST_ID_MAX_LENGTH = 128;

export const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RequestWithContext {
  readonly requestId?: string;
}
