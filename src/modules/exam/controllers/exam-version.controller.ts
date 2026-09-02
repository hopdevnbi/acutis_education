import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
  EXAM_MANAGE_PERMISSION,
  EXAM_READ_PERMISSION,
} from '../constants/exam-permissions.constants';
import {
  CreateExamVersionRequestDto,
  UpdateExamVersionRequestDto,
} from '../dto/exam-version-request.dto';
import {
  ExamVersionListQueryDto,
  ExamVersionListResponseDto,
  ExamVersionResponseDto,
} from '../dto/exam-version-response.dto';
import {
  ExamVersionQuestionListResponseDto,
  ReplaceExamVersionQuestionsRequestDto,
} from '../dto/exam-version-question.dto';
import {
  toExamVersionListResponseDto,
  toExamVersionQuestionListResponseDto,
  toExamVersionResponseDto,
} from '../mappers/exam-response.mapper';
import { ExamService } from '../services/exam.service';
import { rethrowExamServiceError } from '../utils/exam-http.util';

@ApiTags('exam-versions')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class ExamVersionController {
  constructor(
    private readonly examService: ExamService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('exams/:examId/versions')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft exam version' })
  @ApiCreatedResponse({ type: ExamVersionResponseDto })
  async createExamVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('examId') examId: string,
    @Body() request: CreateExamVersionRequestDto,
  ): Promise<ExamVersionResponseDto> {
    try {
      const parishId = await this.examService.getExamParishId(examId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.createExamVersion(examId, {
        title: request.title,
        description: request.description,
        instructions: request.instructions,
        sourceLocale: request.sourceLocale,
        durationMinutes: request.durationMinutes,
        maxAttempts: request.maxAttempts,
        passingScorePercent: request.passingScorePercent,
        shuffleQuestions: request.shuffleQuestions,
        shuffleOptions: request.shuffleOptions,
        reviewPolicy: request.reviewPolicy,
      });

      return toExamVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exams/:examId/versions')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'List exam versions' })
  @ApiOkResponse({ type: ExamVersionListResponseDto })
  async listExamVersions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('examId') examId: string,
    @Query() query: ExamVersionListQueryDto,
  ): Promise<ExamVersionListResponseDto> {
    try {
      const parishId = await this.examService.getExamParishId(examId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.examService.listVersionsByExam(examId, {
        status: query.status,
      });

      return toExamVersionListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exam-versions/:versionId')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'Get an exam version by id' })
  @ApiOkResponse({ type: ExamVersionResponseDto })
  async getExamVersionById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<ExamVersionResponseDto> {
    try {
      const parishId = await this.examService.getVersionExamParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.getVersionById(versionId);

      return toExamVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Patch('exam-versions/:versionId')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update a draft exam version' })
  @ApiOkResponse({ type: ExamVersionResponseDto })
  async updateExamVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: UpdateExamVersionRequestDto,
  ): Promise<ExamVersionResponseDto> {
    try {
      const parishId = await this.examService.getVersionExamParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.examService.updateDraftVersion(versionId, {
        title: request.title,
        description: request.description,
        instructions: request.instructions,
        sourceLocale: request.sourceLocale,
        durationMinutes: request.durationMinutes,
        maxAttempts: request.maxAttempts,
        passingScorePercent: request.passingScorePercent,
        shuffleQuestions: request.shuffleQuestions,
        shuffleOptions: request.shuffleOptions,
        reviewPolicy: request.reviewPolicy,
      });

      return toExamVersionResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Get('exam-versions/:versionId/questions')
  @RequirePermissions(EXAM_READ_PERMISSION)
  @ApiOperation({ summary: 'List ordered questions for an exam version' })
  @ApiOkResponse({ type: ExamVersionQuestionListResponseDto })
  async listExamVersionQuestions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<ExamVersionQuestionListResponseDto> {
    try {
      const parishId = await this.examService.getVersionExamParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.examService.listVersionQuestions(versionId);

      return toExamVersionQuestionListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }

  @Put('exam-versions/:versionId/questions')
  @RequirePermissions(EXAM_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Replace ordered questions for a draft exam version' })
  @ApiOkResponse({ type: ExamVersionQuestionListResponseDto })
  async replaceExamVersionQuestions(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: ReplaceExamVersionQuestionsRequestDto,
  ): Promise<ExamVersionQuestionListResponseDto> {
    try {
      const parishId = await this.examService.getVersionExamParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshots = await this.examService.replaceVersionQuestions(versionId, {
        questionIds: request.questionIds,
      });

      return toExamVersionQuestionListResponseDto(snapshots);
    } catch (error: unknown) {
      rethrowExamServiceError(error);
    }
  }
}
