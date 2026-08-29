import { Injectable } from '@nestjs/common';
import { HEALTH_STATUS_OK, type HealthResponse } from './health.types';

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return { status: HEALTH_STATUS_OK };
  }
}
