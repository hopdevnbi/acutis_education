import { HealthService } from './health.service';
import { HEALTH_STATUS_OK } from './health.types';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
  });

  it('returns a successful infrastructure status payload', () => {
    expect(healthService.getHealth()).toEqual({ status: HEALTH_STATUS_OK });
  });
});
