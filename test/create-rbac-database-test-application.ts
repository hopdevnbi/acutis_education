import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { RbacTestModule } from './rbac-test/rbac-test.module';

export async function createRbacDatabaseTestApplication(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule, RbacTestModule],
  }).compile();

  const application = moduleFixture.createNestApplication({ bufferLogs: true });
  application.useLogger(application.get(Logger));
  configureApplication(application);
  await application.init();

  return application;
}
