import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../src/modules/access-control/access-control.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RbacTestController } from './rbac-test.controller';

@Module({
  imports: [AuthModule, AccessControlModule],
  controllers: [RbacTestController],
})
export class RbacTestModule {}
