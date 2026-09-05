import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  ATTENDANCE_MANAGE_PERMISSION,
  ATTENDANCE_READ_PERMISSION,
} from '../constants/class-operations-permissions.constants';
import { BulkAttendanceUpsertDto } from '../dto/bulk-attendance-upsert.dto';
import { SessionAttendanceResponseDto } from '../dto/session-attendance-response.dto';
import { toSessionAttendanceResponseDto } from '../mappers/class-operations-response.mapper';
import { ClassOperationsAccessService } from '../services/class-operations-access.service';
import { ClassOperationsService } from '../services/class-operations.service';
import { rethrowClassOperationsServiceError } from '../utils/class-operations-http.util';

@ApiTags('class-operations')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ClassSessionAttendanceController {
  constructor(
    private readonly classOperationsService: ClassOperationsService,
    private readonly classOperationsAccessService: ClassOperationsAccessService,
  ) {}

  @Get('class-sessions/:sessionId/attendance')
  @RequirePermissions(ATTENDANCE_READ_PERMISSION)
  @ApiOperation({ summary: 'Get session attendance roster for staff' })
  @ApiOkResponse({ type: SessionAttendanceResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getAttendance(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionAttendanceResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffReadSession(
        authenticatedUser.userId,
        sessionId,
      );

      const view = await this.classOperationsService.getSessionAttendanceView(sessionId);

      return toSessionAttendanceResponseDto(view);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Put('class-sessions/:sessionId/attendance')
  @RequirePermissions(ATTENDANCE_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Bulk upsert attendance marks for a SCHEDULED session' })
  @ApiOkResponse({ type: SessionAttendanceResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiUnprocessableEntityResponse()
  async putAttendance(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() body: BulkAttendanceUpsertDto,
  ): Promise<SessionAttendanceResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffManageSession(
        authenticatedUser.userId,
        sessionId,
      );

      const view = await this.classOperationsService.bulkUpsertAttendanceFromClient(
        sessionId,
        body.records,
        authenticatedUser.userId,
      );

      return toSessionAttendanceResponseDto(view);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }
}
