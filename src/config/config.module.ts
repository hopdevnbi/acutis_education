import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfiguration from './app.configuration';
import databaseConfiguration from './database.configuration';
import { AppConfigService } from './app-config.service';
import { envValidationSchema } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfiguration, databaseConfiguration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ApplicationConfigModule {}
