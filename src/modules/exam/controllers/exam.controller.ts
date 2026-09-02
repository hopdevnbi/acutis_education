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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  EXAM_MANAGE_PERMISSION,
  EXAM_READ_PERMISSION,
} from '../constants/exam-permissions.constants';
import { CreateExamRequestDto } from '../dto/create-exam-request.dto';
import { ExamListQueryDto } from '../dto/exam-list-query.dto';
import { ExamListResponseDto, ExamResponseDto } from '../dto/exam-response.dto';
import { UpdateExamRequestDto } from '../dto/update-exam-request.dto';
import { UpdateExamStatusRequestDto } from '../dto/update-exam-status-request.dto';
import { toExamListResponseDto, toExamResponseDto } from '../mappers/exam-response.mapper';
import { ExamService } from '../services/exam.service';
import { rethrowExamServiceError } from '../utils/exam-http.util';

@ApiTags('exams')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('parishes/:parishId/exams')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an exam for a parish' })
  @ApiCreatedResponse({ type: ExamResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing exam.manage permission or parish scope' })
  async createExam(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Body() request: CreateExamRequestDto,
  ): Promise<ExamResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.createExam(parishId, {
        code: request.code,
      });

      return toExamResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('parishes/:parishId/exams')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'List exams for a parish' })
  @ApiOkResponse({ type: ExamListResponseDto })
  async listExamsByParish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Query() query: ExamListQueryDto,
  ): Promise<ExamListResponseDto> {
    try {
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const result = await this.examService.listExamsByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
      });

      return toExamListResponseDto(result);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exams/:examId')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get an exam by id' })
  @ApiOkResponse({ type: ExamResponseDto })
  async getExamById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('examId') examId: string,
  ): Promise<ExamResponseDto> {
    try {
      const parishId = await this.examService.getExamParishId(examId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.getExamById(examId);

      return toExamResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Patch('exams/:examId')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update an exam' })
  @ApiOkResponse({ type: ExamResponseDto })
  async updateExam(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('examId') examId: string,
    @Body() request: UpdateExamRequestDto,
  ): Promise<ExamResponseDto> {
    try {
      const parishId = await this.examService.getExamParishId(examId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.updateExam(examId, {
        code: request.code,
      });

      return toExamResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Patch('exams/:examId/status')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update exam status' })
  @ApiOkResponse({ type: ExamResponseDto })
  async updateExamStatus(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('examId') examId: string,
    @Body() request: UpdateExamStatusRequestDto,
  ): Promise<ExamResponseDto> {
    try {
      const parishId = await this.examService.getExamParishId(examId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.updateExamStatus(examId, request.status);

      return toExamResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }
}
