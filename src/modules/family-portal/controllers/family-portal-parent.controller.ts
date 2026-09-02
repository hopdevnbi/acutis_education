import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { FAMILY_PORTAL_PARENT_READ_PERMISSIONS } from '../constants/family-portal-permissions.constants';
import {
  ParentContextResponseDto,
  toParentContextResponseDto,
} from '../dto/parent-context-response.dto';
import {
  ParentChildrenResponseDto,
  toParentChildrenResponseDto,
} from '../dto/parent-children-response.dto';
import { ParentEnrollmentProgressQueryDto } from '../dto/parent-enrollment-progress-query.dto';
import {
  ParentEnrollmentProgressResponseDto,
  toParentEnrollmentProgressResponseDto,
} from '../dto/parent-enrollment-progress-response.dto';
import { FamilyPortalService } from '../family-portal.service';
import { rethrowFamilyPortalServiceError } from '../utils/family-portal-http.util';

@ApiTags('me')
@Controller('me/parent')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class FamilyPortalParentController {
  constructor(private readonly familyPortalService: FamilyPortalService) {}

  @Get('context')
  @RequirePermissions(...FAMILY_PORTAL_PARENT_READ_PERMISSIONS)
  @ApiOperation({ summary: 'Get lightweight parent portal bootstrap context' })
  @ApiOkResponse({ type: ParentContextResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Caller is not a parent actor or lacks permissions' })
  async getContext(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<ParentContextResponseDto> {
    try {
      const snapshot = await this.familyPortalService.getParentContext(authenticatedUser.userId);

      return toParentContextResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowFamilyPortalServiceError(error);
    }
  }

  @Get('children')
  @RequirePermissions(...FAMILY_PORTAL_PARENT_READ_PERMISSIONS)
  @ApiOperation({ summary: 'List linked active children with active enrollments' })
  @ApiOkResponse({ type: ParentChildrenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Caller is not a parent actor or lacks permissions' })
  async listChildren(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<ParentChildrenResponseDto> {
    try {
      const snapshot = await this.familyPortalService.listParentChildren(authenticatedUser.userId);

      return toParentChildrenResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowFamilyPortalServiceError(error);
    }
  }

  @Get('enrollments/:enrollmentId/progress')
  @RequirePermissions(...FAMILY_PORTAL_PARENT_READ_PERMISSIONS)
  @ApiOperation({ summary: 'Get composed learning progress for a linked child enrollment' })
  @ApiOkResponse({ type: ParentEnrollmentProgressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'Caller is not linked to the enrollment student or lacks permissions',
  })
  @ApiNotFoundResponse({ description: 'Enrollment was not found' })
  async getEnrollmentProgress(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query() query: ParentEnrollmentProgressQueryDto,
  ): Promise<ParentEnrollmentProgressResponseDto> {
    try {
      const snapshot = await this.familyPortalService.getParentEnrollmentProgress({
        actorUserId: authenticatedUser.userId,
        enrollmentId,
        curriculumId: query.curriculumId,
        canonicalLessonKey: query.canonicalLessonKey,
      });

      return toParentEnrollmentProgressResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowFamilyPortalServiceError(error);
    }
  }
}
