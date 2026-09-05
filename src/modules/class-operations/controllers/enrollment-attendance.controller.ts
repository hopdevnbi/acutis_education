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
import { StaffEnrollmentAttendanceHistoryResponseDto } from '../dto/staff-enrollment-attendance-history-response.dto';
import {
  toAttendanceSummaryResponseDto,
  toStaffEnrollmentAttendanceHistoryResponseDto,
} from '../mappers/class-operations-response.mapper';
import { ClassOperationsAccessService } from '../services/class-operations-access.service';
import { ClassOperationsService } from '../services/class-operations.service';
import { rethrowClassOperationsServiceError } from '../utils/class-operations-http.util';

@ApiTags('class-operations')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class EnrollmentAttendanceController {
  constructor(
    private readonly classOperationsService: ClassOperationsService,
    private readonly classOperationsAccessService: ClassOperationsAccessService,
  ) {}

  @Get(':enrollmentId/attendance')
  @RequirePermissions(ATTENDANCE_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff enrollment attendance history',
    description:
      'Paginated COMPLETED session history for an enrollment (roster ∩ COMPLETED). Staff-scoped only: assigned Catechist, ParishAdmin (own parish), SuperAdmin. Parent/Student must use actor-specific /me routes.',
  })
  @ApiOkResponse({ type: StaffEnrollmentAttendanceHistoryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async getEnrollmentAttendanceHistory(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
    @Query() query: EnrollmentAttendanceHistoryQueryDto,
  ): Promise<StaffEnrollmentAttendanceHistoryResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffReadEnrollmentAttendance(
        authenticatedUser.userId,
        enrollmentId,
      );

      const history = await this.classOperationsService.listEnrollmentAttendanceHistory({
        enrollmentId,
        page: query.page,
        limit: query.limit,
      });

      return toStaffEnrollmentAttendanceHistoryResponseDto(history);
    } catch (error: unknown) {
      rethrowClassOperationsServiceError(error);
    }
  }

  @Get(':enrollmentId/attendance-summary')
  @RequirePermissions(ATTENDANCE_READ_PERMISSION)
  @ApiOperation({
    summary: 'Staff enrollment attendance summary',
    description:
      'Aggregate counts for COMPLETED roster sessions. Staff-scoped only. Parent/Student must use actor-specific /me routes.',
  })
  @ApiOkResponse({ type: AttendanceSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async getEnrollmentAttendanceSummary(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('enrollmentId') enrollmentId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    try {
      await this.classOperationsAccessService.assertCanStaffReadEnrollmentAttendance(
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
