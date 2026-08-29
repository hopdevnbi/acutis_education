import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { configureApplication } from '../src/bootstrap/configure-application';
import { InfrastructureTestAppModule } from './infrastructure-test-app.module';

export async function createTestApplication(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [InfrastructureTestAppModule],
  }).compile();

  const application = moduleFixture.createNestApplication({ bufferLogs: true });
  application.useLogger(application.get(Logger));
  configureApplication(application);
  await application.init();

  return application;
}
