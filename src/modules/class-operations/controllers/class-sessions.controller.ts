import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  CLASS_SESSIONS_MANAGE_PERMISSION,
  CLASS_SESSIONS_READ_PERMISSION,
} from '../constants/class-operations-permissions.constants';
import { ClassSessionListResponseDto } from '../dto/class-session-list-response.dto';
import { ClassSessionResponseDto } from '../dto/class-session-response.dto';
import { CreateClassSessionDto } from '../dto/create-class-session.dto';
import { ListClassSessionsQueryDto } from '../dto/list-class-sessions-query.dto';
import { UpdateClassSessionDto } from '../dto/update-class-session.dto';
import { toClassSessionResponseDto } from '../mappers/class-operations-response.mapper';
import { ClassOperationsAccessService } from '../services/class-operations-access.service';
import { ClassOperationsService } from '../services/class-operations.service';
import { rethrowClassOperationsServiceError } from '../utils/class-operations-http.util';

@ApiTags('class-operations')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ClassSessionsController {
  constructor(
    private readonly classOperationsService: ClassOperationsService,
    private readonly classOperationsAccessService: ClassOperationsAccessService,
  ) {}

  @Post('classes/:classId/sessions')
  @RequirePermissions(CLASS_SESSIONS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Create a SCHEDULED class session and freeze the ACTIVE enrollment roster',
  })
  @ApiCreatedResponse({ type: ClassSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async createSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
    @Body() body: CreateClassSessionDto,
  ): Promise<ClassSessionResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffManageClass(
        authenticatedUser.userId,
        classId,
      );

      const session = await this.classOperationsService.createScheduledSessionForClass({
        classId,
        title: body.title,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        createdByUserId: authenticatedUser.userId,
      });

      return toClassSessionResponseDto(session);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Get('classes/:classId/sessions')
  @RequirePermissions(CLASS_SESSIONS_READ_PERMISSION)
  @ApiOperation({ summary: 'List class sessions for a class (staff scoped)' })
  @ApiOkResponse({ type: ClassSessionListResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async listSessions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query() query: ListClassSessionsQueryDto,
  ): Promise<ClassSessionListResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffReadClass(
        authenticatedUser.userId,
        classId,
      );

      const result = await this.classOperationsService.listSessionsByClassWithCounts({
        classId,
        page: query.page,
        limit: query.limit,
        status: query.status,
        fromStartsAt: query.from,
        toStartsAt: query.to,
      });

      return {
        items: result.items.map(toClassSessionResponseDto),
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      };
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Get('class-sessions/:sessionId')
  @RequirePermissions(CLASS_SESSIONS_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a class session by id (staff scoped)' })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffReadSession(
        authenticatedUser.userId,
        sessionId,
      );

      const session = await this.classOperationsService.getSessionWithCounts(sessionId);

      return toClassSessionResponseDto(session);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Patch('class-sessions/:sessionId')
  @RequirePermissions(CLASS_SESSIONS_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update title/times of a SCHEDULED class session' })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async updateSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateClassSessionDto,
  ): Promise<ClassSessionResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffManageSession(
        authenticatedUser.userId,
        sessionId,
      );

      await this.classOperationsService.updateSession(sessionId, {
        title: body.title,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        updatedByUserId: authenticatedUser.userId,
      });

      const session = await this.classOperationsService.getSessionWithCounts(sessionId);

      return toClassSessionResponseDto(session);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Post('class-sessions/:sessionId/cancel')
  @HttpCode(200)
  @RequirePermissions(CLASS_SESSIONS_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Cancel a SCHEDULED class session' })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async cancelSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffManageSession(
        authenticatedUser.userId,
        sessionId,
      );

      const session = await this.classOperationsService.cancelSession(
        sessionId,
        authenticatedUser.userId,
      );

      return toClassSessionResponseDto(session);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Post('class-sessions/:sessionId/complete')
  @HttpCode(200)
  @RequirePermissions(CLASS_SESSIONS_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Complete a SCHEDULED class session and lock attendance' })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async completeSession(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffManageSession(
        authenticatedUser.userId,
        sessionId,
      );

      const session = await this.classOperationsService.completeSession(
        sessionId,
        authenticatedUser.userId,
      );

      return toClassSessionResponseDto(session);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Post('class-sessions/:sessionId/roster/refresh')
  @HttpCode(200)
  @RequirePermissions(CLASS_SESSIONS_MANAGE_PERMISSION)
  @ApiOperation({
    summary: 'Refresh session roster from ACTIVE enrollments (SCHEDULED + zero marks only)',
  })
  @ApiOkResponse({ type: ClassSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  async refreshRoster(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffManageSession(
        authenticatedUser.userId,
        sessionId,
      );

      await this.classOperationsService.refreshSessionRoster(sessionId);
      const session = await this.classOperationsService.getSessionWithCounts(sessionId);

      return toClassSessionResponseDto(session);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }
}
