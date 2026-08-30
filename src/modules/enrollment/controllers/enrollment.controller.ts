import {
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
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ENROLLMENT_MANAGE_PERMISSION,
  ENROLLMENT_READ_PERMISSION,
} from '../constants/enrollment.constants';
import { CreateEnrollmentRequestDto } from '../dto/create-enrollment-request.dto';
import { EnrollmentListQueryDto } from '../dto/enrollment-list-query.dto';
import { EnrollmentListResponseDto } from '../dto/enrollment-list-response.dto';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';
import { TransferEnrollmentRequestDto } from '../dto/transfer-enrollment-request.dto';
import { UpdateEnrollmentStatusRequestDto } from '../dto/update-enrollment-status-request.dto';
import {
  toEnrollmentListResponseDto,
  toEnrollmentResponseDto,
} from '../mappers/enrollment-response.mapper';
import { EnrollmentService } from '../services/enrollment.service';
import { rethrowEnrollmentServiceError } from '../utils/enrollment-http.util';

@ApiTags('enrollments')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('classes/:classId/enrollments')
  @RequirePermissions(ENROLLMENT_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll a student in a class' })
  @ApiCreatedResponse({ type: EnrollmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing enrollments.manage permission' })
  async enrollStudent(
    @Param('classId') classId: string,
    @Body() request: CreateEnrollmentRequestDto,
  ): Promise<EnrollmentResponseDto> {
    try {
      const snapshot = await this.enrollmentService.enrollStudent(classId, request.studentId);

      return toEnrollmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowEnrollmentServiceError(error);
    }
  }

  @Get('classes/:classId/enrollments')
  @RequirePermissions(ENROLLMENT_READ_PERMISSION)
  @ApiOperation({ summary: 'List enrollments for a class roster' })
  @ApiOkResponse({ type: EnrollmentListResponseDto })
  async listEnrollmentsByClass(
    @Param('classId') classId: string,
    @Query() query: EnrollmentListQueryDto,
  ): Promise<EnrollmentListResponseDto> {
    try {
      const result = await this.enrollmentService.listEnrollmentsByClass(classId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
      });

      return toEnrollmentListResponseDto(result);
    } catch (error: unknown) {
      rethrowEnrollmentServiceError(error);
    }
  }

  @Get('students/:studentId/enrollments')
  @RequirePermissions(ENROLLMENT_READ_PERMISSION)
  @ApiOperation({ summary: 'List enrollment history for a student' })
  @ApiOkResponse({ type: EnrollmentListResponseDto })
  async listEnrollmentsByStudent(
    @Param('studentId') studentId: string,
    @Query() query: EnrollmentListQueryDto,
  ): Promise<EnrollmentListResponseDto> {
    try {
      const result = await this.enrollmentService.listEnrollmentsByStudent(studentId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
      });

      return toEnrollmentListResponseDto(result);
    } catch (error: unknown) {
      rethrowEnrollmentServiceError(error);
    }
  }

  @Get('enrollments/:id')
  @RequirePermissions(ENROLLMENT_READ_PERMISSION)
  @ApiOperation({ summary: 'Get an enrollment by id' })
  @ApiOkResponse({ type: EnrollmentResponseDto })
  async getEnrollmentById(@Param('id') enrollmentId: string): Promise<EnrollmentResponseDto> {
    try {
      const snapshot = await this.enrollmentService.getEnrollmentById(enrollmentId);

      return toEnrollmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowEnrollmentServiceError(error);
    }
  }

  @Patch('enrollments/:id/status')
  @RequirePermissions(ENROLLMENT_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Complete or withdraw an active enrollment' })
  @ApiOkResponse({ type: EnrollmentResponseDto })
  async updateEnrollmentStatus(
    @Param('id') enrollmentId: string,
    @Body() request: UpdateEnrollmentStatusRequestDto,
  ): Promise<EnrollmentResponseDto> {
    try {
      const snapshot = await this.enrollmentService.updateEnrollmentStatus(
        enrollmentId,
        request.status,
      );

      return toEnrollmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowEnrollmentServiceError(error);
    }
  }

  @Post('enrollments/:id/transfer')
  @RequirePermissions(ENROLLMENT_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Transfer an active enrollment to another class' })
  @ApiCreatedResponse({ type: EnrollmentResponseDto })
  async transferEnrollment(
    @Param('id') enrollmentId: string,
    @Body() request: TransferEnrollmentRequestDto,
  ): Promise<EnrollmentResponseDto> {
    try {
      const snapshot = await this.enrollmentService.transferEnrollment(enrollmentId, {
        targetClassId: request.targetClassId,
      });

      return toEnrollmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowEnrollmentServiceError(error);
    }
  }
}
