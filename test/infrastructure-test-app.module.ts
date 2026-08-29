import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../src/config/config.module';
import { HealthModule } from '../src/health/health.module';
import { GlobalExceptionFilter } from '../src/http/global-exception.filter';
import { ApplicationLoggingModule } from '../src/logging/logging.module';

@Module({
  imports: [ApplicationConfigModule, ApplicationLoggingModule, HealthModule],
  providers: [GlobalExceptionFilter],
})
export class InfrastructureTestAppModule {}
