import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassCatechistAssignmentEntity } from './entities/class-catechist-assignment.entity';
import { ClassEntity } from './entities/class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, ClassCatechistAssignmentEntity])],
})
export class ClassModule {}
