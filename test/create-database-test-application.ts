import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { AppModule, type AppModuleOptions } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';

export async function createDatabaseTestApplication(
  options?: AppModuleOptions,
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule.forRoot(options ?? {})],
  }).compile();

  const application = moduleFixture.createNestApplication({ bufferLogs: true });
  application.useLogger(application.get(Logger));
  configureApplication(application);
  await application.init();

  return application;
}
