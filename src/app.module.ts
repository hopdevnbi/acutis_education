import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './http/global-exception.filter';
import { ApplicationLoggingModule } from './logging/logging.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ApplicationConfigModule,
    ApplicationLoggingModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AccessControlModule,
  ],
  providers: [GlobalExceptionFilter],
})
export class AppModule {}
