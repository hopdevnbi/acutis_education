import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../src/modules/access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../src/modules/access-control/guards/permission.guard';

@Controller('test-rbac')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RbacTestController {
  @Get('read')
  @RequirePermissions('test.read')
  readProtectedResource(): { status: string } {
    return { status: 'ok' };
  }

  @Get('manage')
  @RequirePermissions('test.manage')
  manageProtectedResource(): { status: string } {
    return { status: 'ok' };
  }

  @Get('authenticated-only')
  authenticatedOnlyResource(): { status: string } {
    return { status: 'ok' };
  }
}
