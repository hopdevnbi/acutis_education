import { Test, type TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HEALTH_STATUS_OK } from './health.types';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = moduleRef.get(HealthController);
  });

  it('returns the health payload from HealthService', () => {
    expect(healthController.getHealth()).toEqual({ status: HEALTH_STATUS_OK });
  });
});
