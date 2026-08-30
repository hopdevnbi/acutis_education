import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import {
  STUDENT_GUARDIAN_MANAGE_PERMISSION,
  STUDENT_GUARDIAN_READ_PERMISSION,
} from '../constants/student.constants';
import { GuardianLinkListQueryDto } from '../dto/guardian-link-list-query.dto';
import { GuardianLinkListResponseDto } from '../dto/guardian-link-list-response.dto';
import { GuardianLinkResponseDto } from '../dto/guardian-link-response.dto';
import { LinkGuardianRequestDto } from '../dto/link-guardian-request.dto';
import { UpdateGuardianLinkStatusRequestDto } from '../dto/update-guardian-link-status-request.dto';
import {
  toGuardianLinkListResponseDto,
  toGuardianLinkResponseDto,
} from '../mappers/student-guardian-response.mapper';
import {
  STUDENT_DOMAIN_SCOPE_PORT,
  type StudentDomainScopePort,
} from '../interfaces/student-domain-scope.port';
import { StudentGuardianService } from '../services/student-guardian.service';
import { rethrowStudentGuardianServiceError } from '../utils/student-guardian-http.util';

@ApiTags('student-guardians')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StudentGuardianController {
  constructor(
    private readonly studentGuardianService: StudentGuardianService,
    @Inject(STUDENT_DOMAIN_SCOPE_PORT)
    private readonly studentDomainScope: StudentDomainScopePort,
  ) {}

  @Post('students/:studentId/guardians')
  @RequirePermissions(STUDENT_GUARDIAN_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a guardian user to a student' })
  @ApiCreatedResponse({ type: GuardianLinkResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing student-guardians.manage permission' })
  async linkGuardian(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() request: LinkGuardianRequestDto,
  ): Promise<GuardianLinkResponseDto> {
    try {
      await this.studentDomainScope.assertCanManageStudent(authenticatedUser.userId, studentId);

      const snapshot = await this.studentGuardianService.linkGuardian(studentId, {
        guardianUserId: request.guardianUserId,
        relationshipType: request.relationshipType,
        isPrimary: request.isPrimary,
      });

      return toGuardianLinkResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowStudentGuardianServiceError(error);
    }
  }

  @Get('students/:studentId/guardians')
  @RequirePermissions(STUDENT_GUARDIAN_READ_PERMISSION)
  @ApiOperation({ summary: 'List guardian links for a student' })
  @ApiOkResponse({ type: GuardianLinkListResponseDto })
  async listGuardiansByStudent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Query() query: GuardianLinkListQueryDto,
  ): Promise<GuardianLinkListResponseDto> {
    try {
      await this.studentDomainScope.assertCanReadStudent(authenticatedUser.userId, studentId);

      const result = await this.studentGuardianService.listGuardiansByStudent(studentId, {
        page: query.page,
        limit: query.limit,
        includeEnded: query.includeEnded,
      });

      return toGuardianLinkListResponseDto(result);
    } catch (error: unknown) {
      rethrowStudentGuardianServiceError(error);
    }
  }

  @Patch('student-guardians/:id/status')
  @RequirePermissions(STUDENT_GUARDIAN_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'End a guardian link' })
  @ApiOkResponse({ type: GuardianLinkResponseDto })
  async updateGuardianLinkStatus(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') guardianLinkId: string,
    @Body() request: UpdateGuardianLinkStatusRequestDto,
  ): Promise<GuardianLinkResponseDto> {
    try {
      const link = await this.studentGuardianService.getGuardianLinkById(guardianLinkId);

      await this.studentDomainScope.assertCanManageStudent(
        authenticatedUser.userId,
        link.studentId,
      );

      const snapshot = await this.studentGuardianService.updateGuardianLinkStatus(
        guardianLinkId,
        request.status,
      );

      return toGuardianLinkResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowStudentGuardianServiceError(error);
    }
  }
}
