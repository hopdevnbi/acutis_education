import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { EnrollmentQueryService } from './services/enrollment-query.service';

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentEntity])],
  providers: [EnrollmentQueryService],
  exports: [EnrollmentQueryService],
})
export class EnrollmentModule {}
