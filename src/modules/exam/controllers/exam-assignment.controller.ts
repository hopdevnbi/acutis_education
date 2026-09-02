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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  EXAM_ASSIGN_PERMISSION,
  EXAM_READ_PERMISSION,
} from '../constants/exam-permissions.constants';
import {
  EXAM_ASSIGNMENT_SORT_FIELDS,
  EXAM_SORT_DIRECTIONS,
} from '../constants/exam-list.constants';
import {
  CreateExamAssignmentRequestDto,
  ExamAssignmentListQueryDto,
  ExamAssignmentListResponseDto,
  ExamAssignmentResponseDto,
  UpdateExamAssignmentRequestDto,
} from '../dto/exam-assignment.dto';
import {
  toExamAssignmentListResponseDto,
  toExamAssignmentResponseDto,
} from '../mappers/exam-response.mapper';
import { ExamAssignmentService } from '../services/exam-assignment.service';
import { rethrowExamServiceError } from '../utils/exam-http.util';

@ApiTags('exam-assignments')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ExamAssignmentController {
  constructor(
    private readonly examAssignmentService: ExamAssignmentService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('parishes/:parishId/classes/:classId/exam-assignments')
  @RequirePermissions(EXAM_ASSIGN_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a class exam assignment' })
  @ApiCreatedResponse({ type: ExamAssignmentResponseDto })
  async createExamAssignment(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Param('classId') classId: string,
    @Body() request: CreateExamAssignmentRequestDto,
  ): Promise<ExamAssignmentResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examAssignmentService.createAssignment(
        parishId,
        classId,
        authenticatedUser.userId,
        {
          examVersionId: request.examVersionId,
          opensAt: new Date(request.opensAt),
          closesAt: new Date(request.closesAt),
        },
      );

      return toExamAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('parishes/:parishId/classes/:classId/exam-assignments')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'List class exam assignments' })
  @ApiOkResponse({ type: ExamAssignmentListResponseDto })
  async listExamAssignments(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Param('classId') classId: string,
    @Query() query: ExamAssignmentListQueryDto,
  ): Promise<ExamAssignmentListResponseDto> {
    try {
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const result = await this.examAssignmentService.listAssignmentsByClass(parishId, classId, {
        page: query.page,
        limit: query.limit,
        sortBy: EXAM_ASSIGNMENT_SORT_FIELDS[0],
        sort: EXAM_SORT_DIRECTIONS[0],
        status: query.status,
      });

      return toExamAssignmentListResponseDto(result);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exam-assignments/:assignmentId')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get an exam assignment by id' })
  @ApiOkResponse({ type: ExamAssignmentResponseDto })
  async getExamAssignmentById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ): Promise<ExamAssignmentResponseDto> {
    try {
      const parishId = await this.examAssignmentService.getAssignmentParishId(assignmentId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.examAssignmentService.getAssignmentById(assignmentId);

      return toExamAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Patch('exam-assignments/:assignmentId')
  @RequirePermissions(EXAM_ASSIGN_PERMISSION)
  @ApiOperation({ summary: 'Update an exam assignment' })
  @ApiOkResponse({ type: ExamAssignmentResponseDto })
  async updateExamAssignment(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() request: UpdateExamAssignmentRequestDto,
  ): Promise<ExamAssignmentResponseDto> {
    try {
      const parishId = await this.examAssignmentService.getAssignmentParishId(assignmentId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examAssignmentService.updateAssignment(assignmentId, {
        opensAt: request.opensAt === undefined ? undefined : new Date(request.opensAt),
        closesAt: request.closesAt === undefined ? undefined : new Date(request.closesAt),
        status: request.status,
      });

      return toExamAssignmentResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }
}
