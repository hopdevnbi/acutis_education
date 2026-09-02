import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { LEARNER_SELF_READ_PERMISSION } from '../../student/constants/learner-permissions.constants';
import { LearnerContextResponseDto } from '../dto/learner-context-response.dto';
import { toLearnerContextResponseDto } from '../mappers/learner-context-response.mapper';
import { LearnerContextService } from '../services/learner-context.service';

@ApiTags('me')
@Controller('me')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class MeController {
  constructor(private readonly learnerContextService: LearnerContextService) {}

  @Get('learner-context')
  @RequirePermissions(LEARNER_SELF_READ_PERMISSION)
  @ApiOperation({
    summary: 'Resolve linked student profile and active enrollments for the authenticated learner',
  })
  @ApiOkResponse({ type: LearnerContextResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing learner.self.read permission' })
  async getLearnerContext(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<LearnerContextResponseDto> {
    const snapshot = await this.learnerContextService.getLearnerContextForUser(
      authenticatedUser.userId,
    );

    return toLearnerContextResponseDto(snapshot);
  }
}
