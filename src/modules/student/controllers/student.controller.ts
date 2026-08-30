import {
  BadRequestException,
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
import { CreateStudentRequestDto } from '../dto/create-student-request.dto';
import { StudentListQueryDto } from '../dto/student-list-query.dto';
import { StudentListResponseDto } from '../dto/student-list-response.dto';
import { StudentResponseDto } from '../dto/student-response.dto';
import { UpdateStudentRequestDto } from '../dto/update-student-request.dto';
import {
  STUDENT_DOMAIN_SCOPE_PORT,
  type StudentDomainScopePort,
} from '../interfaces/student-domain-scope.port';
import { toStudentListResponseDto, toStudentResponseDto } from '../mappers/student-response.mapper';
import { StudentAccessService } from '../services/student-access.service';
import { StudentService } from '../services/student.service';
import { STUDENT_MANAGE_PERMISSION, STUDENT_READ_PERMISSION } from '../constants/student.constants';
import { rethrowStudentServiceError } from '../utils/student-http.util';

@ApiTags('students')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly studentAccessService: StudentAccessService,
    @Inject(STUDENT_DOMAIN_SCOPE_PORT)
    private readonly studentDomainScope: StudentDomainScopePort,
  ) {}

  @Post('students')
  @RequirePermissions(STUDENT_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a student profile' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing students.manage permission' })
  async createStudent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() request: CreateStudentRequestDto,
  ): Promise<StudentResponseDto> {
    try {
      await this.studentAccessService.assertCanCreateStudent(authenticatedUser.userId);

      const snapshot = await this.studentService.createStudent({
        fullName: request.fullName,
        userId: request.userId,
      });

      return toStudentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowStudentServiceError(error);
    }
  }

  @Get('students')
  @RequirePermissions(STUDENT_READ_PERMISSION)
  @ApiOperation({ summary: 'List student profiles' })
  @ApiOkResponse({ type: StudentListResponseDto })
  async listStudents(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: StudentListQueryDto,
  ): Promise<StudentListResponseDto> {
    try {
      const accessibleStudentIds = await this.studentDomainScope.resolveAccessibleStudentIds(
        authenticatedUser.userId,
      );

      const result = await this.studentService.listStudents({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
        studentIds: accessibleStudentIds ?? undefined,
      });

      return toStudentListResponseDto(result);
    } catch (error: unknown) {
      rethrowStudentServiceError(error);
    }
  }

  @Get('students/:id')
  @RequirePermissions(STUDENT_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a student profile by id' })
  @ApiOkResponse({ type: StudentResponseDto })
  async getStudentById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') studentId: string,
  ): Promise<StudentResponseDto> {
    try {
      await this.studentDomainScope.assertCanReadStudent(authenticatedUser.userId, studentId);

      const snapshot = await this.studentService.getStudentById(studentId);

      return toStudentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowStudentServiceError(error);
    }
  }

  @Patch('students/:id')
  @RequirePermissions(STUDENT_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update a student profile' })
  @ApiOkResponse({ type: StudentResponseDto })
  async updateStudent(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') studentId: string,
    @Body() request: UpdateStudentRequestDto,
  ): Promise<StudentResponseDto> {
    if (
      request.fullName === undefined &&
      request.userId === undefined &&
      request.status === undefined
    ) {
      throw new BadRequestException('At least one student field must be provided for update.');
    }

    try {
      await this.studentDomainScope.assertCanManageStudent(authenticatedUser.userId, studentId);

      const snapshot = await this.studentService.updateStudent(studentId, {
        fullName: request.fullName,
        userId: request.userId,
        status: request.status,
      });

      return toStudentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowStudentServiceError(error);
    }
  }
}
