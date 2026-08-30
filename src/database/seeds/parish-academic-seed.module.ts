import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { AcademicStructureModule } from '../../modules/academic-structure/academic-structure.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { DatabaseModule } from '../database.module';
import { ParishAcademicSeedService } from './parish-academic.seed.service';

@Module({
  imports: [ApplicationConfigModule, DatabaseModule, ParishModule, AcademicStructureModule],
  providers: [ParishAcademicSeedService],
  exports: [ParishAcademicSeedService],
})
export class ParishAcademicSeedModule {}
