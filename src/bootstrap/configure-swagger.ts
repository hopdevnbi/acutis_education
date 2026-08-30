import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { API_GLOBAL_PREFIX } from '../app.constants';

export const SWAGGER_DOCUMENT_PATH = 'api/docs' as const;

export function configureSwagger(application: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Catechism API')
    .setDescription('Parish catechism platform backend API')
    .setVersion('1.0')
    .addServer(`/${API_GLOBAL_PREFIX}`, 'Version 1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Short-lived access token from POST /auth/login',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(application, swaggerConfig, {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup(SWAGGER_DOCUMENT_PATH, application, document, {
    useGlobalPrefix: false,
    jsonDocumentUrl: `${SWAGGER_DOCUMENT_PATH}-json`,
  });
}
