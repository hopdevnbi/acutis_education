import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(AppModule.forRoot(), { bufferLogs: true });
  application.useLogger(application.get(Logger));
  configureApplication(application);

  const appConfigService = application.get(AppConfigService);
  const port = appConfigService.getPort();

  await application.listen(port);

  const logger = application.get(Logger);
  logger.log(`Application listening on port ${port}`);
}

void bootstrap();
