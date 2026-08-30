import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../database.module';
import { AccessControlModule } from '../../modules/access-control/access-control.module';
import { UsersModule } from '../../modules/users/users.module';
import { AuthRbacSeedService } from './auth-rbac.seed.service';

@Module({
  imports: [ApplicationConfigModule, DatabaseModule, UsersModule, AccessControlModule],
  providers: [AuthRbacSeedService],
  exports: [AuthRbacSeedService],
})
export class AuthRbacSeedModule {}
