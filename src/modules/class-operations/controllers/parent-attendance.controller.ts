import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { ATTENDANCE_READ_PERMISSION } from '../constants/class-operations-permissions.constants';
import { AttendanceSummaryResponseDto } from '../dto/attendance-summary-response.dto';
import { EnrollmentAttendanceHistoryQueryDto } from '../dto/enrollment-attendance-history-query.dto';
import { LearnerAttendanceHistoryResponseDto } from '../dto/learner-attendance-history-response.dto';
import {
  toAttendanceSummaryResponseDto,
  toLearnerAttendanceHistoryResponseDto,
} from '../mappers/class-operations-response.mapper';
import { ClassOperationsAccessService } from '../services/class-operations-access.service';
import { ClassOperationsService } from '../services/class-operations.service';
import { rethrowClassOperationsServiceError } from '../utils/class-operations-http.util';

@ApiTags('class-operations')
@Controller('me/parent')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ParentAttendanceController {
  constructor(
    private readonly classOperationsService: ClassOperationsService,
    private readonly classOperationsAccessService: ClassOperationsAccessService,
  ) {}

  @Get('enrollments/:enrollmentId/attendance')
  @RequirePermissions(ATTENDANCE_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child enrollment attendance history',
    description:
      'Requires genuine PARENT role and an ACTIVE guardian relationship to the enrollment student. Learner-safe: omits note and audit actor IDs. No admin impersonation.',
  })
  @ApiOkResponse({ type: LearnerAttendanceHistoryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async getParentEnrollmentAttendanceHistory(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
    @Query() query: EnrollmentAttendanceHistoryQueryDto,
  ): Promise<LearnerAttendanceHistoryResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanParentReadEnrollmentAttendance(
        authenticatedUser.userId,
        enrollmentId,
      );

      const history = await this.classOperationsService.listEnrollmentAttendanceHistory({
        enrollmentId,
        page: query.page,
        limit: query.limit,
      });

      return toLearnerAttendanceHistoryResponseDto(history);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Get('enrollments/:enrollmentId/attendance-summary')
  @RequirePermissions(ATTENDANCE_READ_PERMISSION)
  @ApiOperation({
    summary: 'Parent linked-child enrollment attendance summary',
    description:
      'Requires genuine PARENT role and an ACTIVE guardian relationship. Compact summary only; no note.',
  })
  @ApiOkResponse({ type: AttendanceSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async getParentEnrollmentAttendanceSummary(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanParentReadEnrollmentAttendance(
        authenticatedUser.userId,
        enrollmentId,
      );

      const summary =
        await this.classOperationsService.getEnrollmentAttendanceSummary(enrollmentId);

      return toAttendanceSummaryResponseDto(summary);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }
}
