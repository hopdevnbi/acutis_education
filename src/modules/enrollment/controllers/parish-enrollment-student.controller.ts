import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ClassScopeService } from '../../class/services/class-scope.service';
import { ParishService } from '../../parish/services/parish.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  PARISH_GUARDIAN_READ_SCOPE_PORT,
  type ParishGuardianReadScopePort,
} from '../../parish/interfaces/parish-guardian-read-scope.port';
import { assertParishReadScope } from '../../parish/utils/assert-parish-read-scope';
import { ParishStudentListQueryDto } from '../../student/dto/student-list-query.dto';
import { StudentListResponseDto } from '../../student/dto/student-list-response.dto';
import {
  STUDENT_DOMAIN_SCOPE_PORT,
  type StudentDomainScopePort,
} from '../../student/interfaces/student-domain-scope.port';
import { toStudentResponseDto } from '../../student/mappers/student-response.mapper';
import { StudentService } from '../../student/services/student.service';
import { STUDENT_READ_PERMISSION } from '../../student/constants/student.constants';
import { rethrowStudentServiceError } from '../../student/utils/student-http.util';
import { EnrollmentQueryService } from '../services/enrollment-query.service';

@ApiTags('students')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ParishEnrollmentStudentController {
  constructor(
    private readonly enrollmentQueryService: EnrollmentQueryService,
    private readonly studentService: StudentService,
    private readonly parishService: ParishService,
    private readonly parishScopeService: ParishScopeService,
    private readonly classScopeService: ClassScopeService,
    @Inject(STUDENT_DOMAIN_SCOPE_PORT)
    private readonly studentDomainScope: StudentDomainScopePort,
    @Inject(PARISH_GUARDIAN_READ_SCOPE_PORT)
    private readonly parishGuardianReadScope: ParishGuardianReadScopePort,
  ) {}

  @Get('parishes/:parishId/students')
  @RequirePermissions(STUDENT_READ_PERMISSION)
  @ApiOperation({
    summary: 'List students with active enrollments in a parish',
    description:
      'Returns distinct student profiles with at least one ACTIVE enrollment in the parish.',
  })
  @ApiOkResponse({ type: StudentListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing students.read permission or parish scope denied' })
  async listStudentsByParish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Query() query: ParishStudentListQueryDto,
  ): Promise<StudentListResponseDto> {
    try {
      await assertParishReadScope(authenticatedUser.userId, parishId, {
        isSuperAdmin: (userId) => this.parishScopeService.isSuperAdmin(userId),
        hasActiveParishMembership: (userId, scopedParishId) =>
          this.parishScopeService.hasActiveParishMembership(userId, scopedParishId),
        canReadParishAsCatechist: (userId, scopedParishId) =>
          this.classScopeService.canReadParishAsCatechist(userId, scopedParishId),
        canReadParishAsGuardian: (userId, scopedParishId) =>
          this.parishGuardianReadScope.canReadParishAsGuardian(userId, scopedParishId),
      });

      await this.parishService.getParishById(parishId);

      const enrollmentResult =
        await this.enrollmentQueryService.listDistinctActiveStudentIdsInParish(parishId, {
          page: query.page,
          limit: query.limit,
          sortBy: query.sortBy,
          sort: query.sort,
          academicYearId: query.academicYearId,
          search: query.search,
        });

      const accessibleStudentIds = await this.studentDomainScope.resolveAccessibleStudentIds(
        authenticatedUser.userId,
      );
      const filteredStudentIds =
        accessibleStudentIds === null
          ? enrollmentResult.studentIds
          : enrollmentResult.studentIds.filter((studentId) =>
              accessibleStudentIds.includes(studentId),
            );

      const items = await this.studentService.getStudentSnapshotsByIds(filteredStudentIds);

      return {
        items: items.map(toStudentResponseDto),
        page: enrollmentResult.page,
        limit: enrollmentResult.limit,
        total: accessibleStudentIds === null ? enrollmentResult.total : filteredStudentIds.length,
        totalPages:
          accessibleStudentIds === null
            ? enrollmentResult.totalPages
            : filteredStudentIds.length === 0
              ? 0
              : Math.ceil(filteredStudentIds.length / enrollmentResult.limit),
      };
    } catch (error: unknown) {
      rethrowStudentServiceError(error);
    }
  }
}
