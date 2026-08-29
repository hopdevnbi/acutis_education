export interface ApiErrorResponse {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string | string[];
  readonly path: string;
  readonly timestamp: string;
  readonly requestId: string;
}
