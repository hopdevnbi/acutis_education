import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentEntity } from './entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentEntity])],
})
export class EnrollmentModule {}
