import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ParishController } from './controllers/parish.controller';
import { ParishEntity } from './entities/parish.entity';
import { ParishMembershipEntity } from './entities/parish-membership.entity';
import { ParishService } from './services/parish.service';
import { ParishScopeService } from './services/parish-scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParishEntity, ParishMembershipEntity]),
    AuthModule,
    AccessControlModule,
  ],
  controllers: [ParishController],
  providers: [ParishService, ParishScopeService],
  exports: [ParishService, ParishScopeService],
})
export class ParishModule {}
