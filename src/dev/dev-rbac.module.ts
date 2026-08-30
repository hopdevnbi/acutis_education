import { Module } from '@nestjs/common';
import { AccessControlModule } from '../modules/access-control/access-control.module';
import { AuthModule } from '../modules/auth/auth.module';
import { DevRbacController } from './dev-rbac.controller';

@Module({
  imports: [AuthModule, AccessControlModule],
  controllers: [DevRbacController],
})
export class DevRbacModule {}
