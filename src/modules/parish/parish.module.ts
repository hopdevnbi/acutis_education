import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ParishController } from './controllers/parish.controller';
import { ParishEntity } from './entities/parish.entity';
import { ParishMembershipEntity } from './entities/parish-membership.entity';
import { ParishMembershipService } from './services/parish-membership.service';
import { ParishService } from './services/parish.service';
import { ParishScopeService } from './services/parish-scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParishEntity, ParishMembershipEntity]),
    AuthModule,
    AccessControlModule,
    UsersModule,
  ],
  controllers: [ParishController],
  providers: [ParishService, ParishScopeService, ParishMembershipService],
  exports: [ParishService, ParishScopeService, ParishMembershipService],
})
export class ParishModule {}
