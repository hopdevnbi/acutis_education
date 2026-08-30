import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEntity } from './entities/student.entity';
import { StudentGuardianEntity } from './entities/student-guardian.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentEntity, StudentGuardianEntity])],
})
export class StudentModule {}
