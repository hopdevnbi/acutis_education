import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { LearningContentModule } from '../learning-content/learning-content.module';
import { LocalizationModule } from '../localization/localization.module';
import { MediaModule } from '../media/media.module';
import { ParishModule } from '../parish/parish.module';
import { UsersModule } from '../users/users.module';
import { CurriculumDeliveryController } from './controllers/curriculum-delivery.controller';
import { CurriculumDeliveryService } from './services/curriculum-delivery.service';

@Module({
  imports: [
    CurriculumModule,
    LearningContentModule,
    MediaModule,
    ClassModule,
    EnrollmentModule,
    AuthModule,
    AccessControlModule,
    LocalizationModule,
    UsersModule,
    ParishModule,
  ],
  controllers: [CurriculumDeliveryController],
  providers: [CurriculumDeliveryService],
})
export class CurriculumDeliveryModule {}
