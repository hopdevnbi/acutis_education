import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { FAMILY_PORTAL_CATECHIST_READ_PERMISSIONS } from '../constants/family-portal-permissions.constants';
import {
  CatechistContextResponseDto,
  toCatechistContextResponseDto,
} from '../dto/catechist-context-response.dto';
import { CatechistClassListQueryDto } from '../dto/catechist-class-list-query.dto';
import {
  CatechistClassListResponseDto,
  toCatechistClassListResponseDto,
} from '../dto/catechist-class-summary-response.dto';
import { CatechistRosterQueryDto } from '../dto/catechist-roster-query.dto';
import {
  CatechistClassRosterResponseDto,
  toCatechistClassRosterResponseDto,
} from '../dto/catechist-roster-response.dto';
import { FamilyPortalService } from '../family-portal.service';
import { rethrowFamilyPortalServiceError } from '../utils/family-portal-http.util';

@ApiTags('me')
@Controller('me/catechist')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class FamilyPortalCatechistController {
  constructor(private readonly familyPortalService: FamilyPortalService) {}

  @Get('context')
  @RequirePermissions(...FAMILY_PORTAL_CATECHIST_READ_PERMISSIONS)
  @ApiOperation({
    summary: 'Get lightweight catechist portal bootstrap context',
    description:
      'Requires classes.read, enrollments.read, and learning-progress.read. The authenticated user must hold the CATECHIST actor role; administrators are not treated as portal actors.',
  })
  @ApiOkResponse({ type: CatechistContextResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Caller is not a catechist actor or lacks permissions' })
  async getContext(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<CatechistContextResponseDto> {
    try {
      const snapshot = await this.familyPortalService.getCatechistContext(authenticatedUser.userId);

      return toCatechistContextResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowFamilyPortalServiceError(error);
    }
  }

  @Get('classes')
  @RequirePermissions(...FAMILY_PORTAL_CATECHIST_READ_PERMISSIONS)
  @ApiOperation({
    summary: 'List paginated class summaries for assigned catechist classes',
    description:
      'Requires classes.read, enrollments.read, and learning-progress.read. Returns ACTIVE catechist assignments only; there is no parish-wide or administrator fallback.',
  })
  @ApiOkResponse({ type: CatechistClassListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid page or limit query parameter' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Caller is not a catechist actor or lacks permissions' })
  async listClasses(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: CatechistClassListQueryDto,
  ): Promise<CatechistClassListResponseDto> {
    try {
      const snapshot = await this.familyPortalService.listCatechistClasses({
        actorUserId: authenticatedUser.userId,
        page: query.page,
        limit: query.limit,
      });

      return toCatechistClassListResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowFamilyPortalServiceError(error);
    }
  }

  @Get('classes/:classId/roster')
  @RequirePermissions(...FAMILY_PORTAL_CATECHIST_READ_PERMISSIONS)
  @ApiOperation({
    summary: 'Get paginated class roster with learning, practice, and exam summaries',
    description:
      'Requires classes.read, enrollments.read, and learning-progress.read. Available only when the authenticated CATECHIST has an ACTIVE assignment to the requested class.',
  })
  @ApiOkResponse({ type: CatechistClassRosterResponseDto })
  @ApiBadRequestResponse({
    description: 'Malformed class UUID or invalid pagination/curriculum query parameter',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'Caller is not assigned to this class or lacks permissions',
  })
  async getClassRoster(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: CatechistRosterQueryDto,
  ): Promise<CatechistClassRosterResponseDto> {
    try {
      const snapshot = await this.familyPortalService.getCatechistClassRoster({
        actorUserId: authenticatedUser.userId,
        classId,
        page: query.page,
        limit: query.limit,
        curriculumId: query.curriculumId,
        canonicalLessonKey: query.canonicalLessonKey,
      });

      return toCatechistClassRosterResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowFamilyPortalServiceError(error);
    }
  }
}
