import type { INestApplication } from '@nestjs/common';
import { API_GLOBAL_PREFIX } from '../app.constants';
import { AppConfigService } from '../config/app-config.service';
import { GlobalExceptionFilter } from '../http/global-exception.filter';
import { configureSwagger } from './configure-swagger';
import { createValidationPipe } from './create-validation-pipe';

export function configureApplication(application: INestApplication): void {
  const appConfigService = application.get(AppConfigService);

  application.setGlobalPrefix(API_GLOBAL_PREFIX);
  application.useGlobalPipes(createValidationPipe());
  application.useGlobalFilters(application.get(GlobalExceptionFilter));

  if (appConfigService.isSwaggerEnabled()) {
    configureSwagger(application);
  }
}
