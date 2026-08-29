export const HEALTH_STATUS_OK = 'ok' as const;

export interface HealthResponse {
  readonly status: typeof HEALTH_STATUS_OK;
}
