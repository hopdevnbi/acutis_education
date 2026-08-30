import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ParishService } from '../../parish/services/parish.service';
import { STUDENT_MANAGE_PERMISSION, STUDENT_READ_PERMISSION } from '../constants/student.constants';
import { CreateStudentRequestDto } from '../dto/create-student-request.dto';
import { ParishStudentListQueryDto, StudentListQueryDto } from '../dto/student-list-query.dto';
import { StudentListResponseDto } from '../dto/student-list-response.dto';
import { StudentResponseDto } from '../dto/student-response.dto';
import { UpdateStudentRequestDto } from '../dto/update-student-request.dto';
import { toStudentListResponseDto, toStudentResponseDto } from '../mappers/student-response.mapper';
import { StudentService } from '../services/student.service';
import { rethrowStudentServiceError } from '../utils/student-http.util';

@ApiTags('students')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly parishService: ParishService,
    private readonly enrollmentQueryService: EnrollmentQueryService,
  ) {}

  @Post('students')
  @RequirePermissions(STUDENT_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a student profile' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing students.manage permission' })
  async createStudent(@Body() request: CreateStudentRequestDto): Promise<StudentResponseDto> {
    try {
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
  async listStudents(@Query() query: StudentListQueryDto): Promise<StudentListResponseDto> {
    try {
      const result = await this.studentService.listStudents({
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
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
  async getStudentById(@Param('id') studentId: string): Promise<StudentResponseDto> {
    try {
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

  @Get('parishes/:parishId/students')
  @RequirePermissions(STUDENT_READ_PERMISSION)
  @ApiOperation({
    summary: 'List students with active enrollments in a parish',
    description:
      'Returns distinct student profiles with at least one ACTIVE enrollment in the parish.',
  })
  @ApiOkResponse({ type: StudentListResponseDto })
  async listStudentsByParish(
    @Param('parishId') parishId: string,
    @Query() query: ParishStudentListQueryDto,
  ): Promise<StudentListResponseDto> {
    try {
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

      const items = await this.studentService.getStudentSnapshotsByIds(enrollmentResult.studentIds);

      return {
        items: items.map(toStudentResponseDto),
        page: enrollmentResult.page,
        limit: enrollmentResult.limit,
        total: enrollmentResult.total,
        totalPages: enrollmentResult.totalPages,
      };
    } catch (error: unknown) {
      rethrowStudentServiceError(error);
    }
  }
}
