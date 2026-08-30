import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ParishModule } from '../parish/parish.module';
import { AcademicYearController } from './controllers/academic-year.controller';
import { CatechismLevelController } from './controllers/catechism-level.controller';
import { AcademicYearEntity } from './entities/academic-year.entity';
import { CatechismLevelEntity } from './entities/catechism-level.entity';
import { AcademicYearService } from './services/academic-year.service';
import { CatechismLevelService } from './services/catechism-level.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicYearEntity, CatechismLevelEntity]),
    ParishModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [AcademicYearController, CatechismLevelController],
  providers: [AcademicYearService, CatechismLevelService],
  exports: [AcademicYearService, CatechismLevelService],
})
export class AcademicStructureModule {}
