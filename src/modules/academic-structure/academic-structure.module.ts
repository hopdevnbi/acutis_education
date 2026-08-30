import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYearEntity } from './entities/academic-year.entity';
import { CatechismLevelEntity } from './entities/catechism-level.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYearEntity, CatechismLevelEntity])],
})
export class AcademicStructureModule {}
