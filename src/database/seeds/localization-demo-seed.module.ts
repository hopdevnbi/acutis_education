import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { CurriculumModule } from '../../modules/curriculum/curriculum.module';
import { LocalizationModule } from '../../modules/localization/localization.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { QuestionBankModule } from '../../modules/question-bank/question-bank.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { LocalizationDemoSeedService } from './localization-demo.seed.service';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    UsersModule,
    ParishModule,
    CurriculumModule,
    QuestionBankModule,
    LocalizationModule,
  ],
  providers: [LocalizationDemoSeedService],
  exports: [LocalizationDemoSeedService],
})
export class LocalizationDemoSeedModule {}
