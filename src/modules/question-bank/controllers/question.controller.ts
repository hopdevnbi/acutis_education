import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
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
  QUESTION_MANAGE_PERMISSION,
  QUESTION_READ_PERMISSION,
} from '../constants/question-permissions.constants';
import { CreateQuestionCurriculumLinkRequestDto } from '../dto/create-question-curriculum-link-request.dto';
import { CreateQuestionRequestDto } from '../dto/create-question-request.dto';
import { CreateQuestionResponseDto } from '../dto/create-question-response.dto';
import { CreateQuestionVersionRequestDto } from '../dto/create-question-version-request.dto';
import { QuestionCurriculumLinkListResponseDto } from '../dto/question-curriculum-link-list-response.dto';
import { QuestionCurriculumLinkResponseDto } from '../dto/question-curriculum-link-response.dto';
import { QuestionListQueryDto } from '../dto/question-list-query.dto';
import { QuestionListResponseDto } from '../dto/question-list-response.dto';
import { QuestionResponseDto } from '../dto/question-response.dto';
import { QuestionTagLinkResponseDto } from '../dto/question-tag-link-response.dto';
import { QuestionTagResponseDto } from '../dto/question-tag-response.dto';
import { QuestionVersionListQueryDto } from '../dto/question-version-list-query.dto';
import { QuestionVersionListResponseDto } from '../dto/question-version-list-response.dto';
import { QuestionVersionResponseDto } from '../dto/question-version-response.dto';
import { UpdateQuestionRequestDto } from '../dto/update-question-request.dto';
import { UpdateQuestionStatusRequestDto } from '../dto/update-question-status-request.dto';
import {
  toCreateQuestionResponse,
  toQuestionCurriculumLinkListResponse,
  toQuestionCurriculumLinkResponse,
  toQuestionListResponse,
  toQuestionResponse,
  toQuestionTagLinkResponse,
  toQuestionTagResponse,
  toQuestionVersionListResponse,
  toQuestionVersionResponse,
} from '../mappers/question-bank-response.mapper';
import { QuestionBankService } from '../services/question-bank.service';
import { QuestionCurriculumLinkService } from '../services/question-curriculum-link.service';
import { QuestionTagService } from '../services/question-tag.service';
import { rethrowQuestionBankServiceError } from '../utils/question-http.util';

@ApiTags('questions')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class QuestionController {
  constructor(
    private readonly questionBankService: QuestionBankService,
    private readonly questionTagService: QuestionTagService,
    private readonly questionCurriculumLinkService: QuestionCurriculumLinkService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('parishes/:parishId/questions')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a question with an initial draft version' })
  @ApiCreatedResponse({ type: CreateQuestionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.manage permission or parish scope' })
  async createQuestion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Body() request: CreateQuestionRequestDto,
  ): Promise<CreateQuestionResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const result = await this.questionBankService.createQuestion(parishId, {
        code: request.code,
        sourceLocale: request.sourceLocale,
        createdByUserId: authenticatedUser.userId,
        draft: {
          questionType: request.draft.questionType,
          prompt: request.draft.prompt,
          instruction: request.draft.instruction,
          explanation: request.draft.explanation,
          difficulty: request.draft.difficulty,
        },
      });

      return toCreateQuestionResponse(result);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('parishes/:parishId/questions')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'List questions for a parish' })
  @ApiOkResponse({ type: QuestionListResponseDto })
  async listQuestionsByParish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Query() query: QuestionListQueryDto,
  ): Promise<QuestionListResponseDto> {
    try {
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const result = await this.questionBankService.listQuestionsByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        sourceLocale: query.sourceLocale,
        search: query.search,
      });

      return toQuestionListResponse(result);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('questions/:id')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a question by id' })
  @ApiOkResponse({ type: QuestionResponseDto })
  async getQuestionById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') questionId: string,
  ): Promise<QuestionResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.getQuestionById(questionId);

      return toQuestionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Patch('questions/:id')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update question metadata' })
  @ApiOkResponse({ type: QuestionResponseDto })
  async updateQuestion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') questionId: string,
    @Body() request: UpdateQuestionRequestDto,
  ): Promise<QuestionResponseDto> {
    if (request.code === undefined && request.sourceLocale === undefined) {
      throw new BadRequestException('At least one question field must be provided for update.');
    }

    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.updateQuestion(questionId, {
        code: request.code,
        sourceLocale: request.sourceLocale,
      });

      return toQuestionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Patch('questions/:id/status')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update question lifecycle status' })
  @ApiOkResponse({ type: QuestionResponseDto })
  async updateQuestionStatus(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') questionId: string,
    @Body() request: UpdateQuestionStatusRequestDto,
  ): Promise<QuestionResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.updateQuestionStatus(
        questionId,
        request.status,
      );

      return toQuestionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Post('questions/:questionId/versions')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft question version' })
  @ApiCreatedResponse({ type: QuestionVersionResponseDto })
  async createDraftVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Body() request: CreateQuestionVersionRequestDto,
  ): Promise<QuestionVersionResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.createDraftVersion(questionId, {
        createdByUserId: authenticatedUser.userId,
        questionType: request.questionType,
        prompt: request.prompt,
        instruction: request.instruction,
        explanation: request.explanation,
        difficulty: request.difficulty,
      });

      return toQuestionVersionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('questions/:questionId/versions')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'List question versions' })
  @ApiOkResponse({ type: QuestionVersionListResponseDto })
  async listVersionsByQuestion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Query() query: QuestionVersionListQueryDto,
  ): Promise<QuestionVersionListResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.questionBankService.listVersionsByQuestion(questionId, {
        status: query.status,
      });

      return toQuestionVersionListResponse(snapshots);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Post('questions/:questionId/tags/:tagId')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a tag to a question' })
  @ApiCreatedResponse({ type: QuestionTagLinkResponseDto })
  async linkTag(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Param('tagId') tagId: string,
  ): Promise<QuestionTagLinkResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionTagService.linkTag(questionId, tagId);

      return toQuestionTagLinkResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Delete('questions/:questionId/tags/:tagId')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a tag from a question' })
  @ApiNoContentResponse({ description: 'Tag unlinked successfully' })
  async unlinkTag(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Param('tagId') tagId: string,
  ): Promise<void> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      await this.questionTagService.unlinkTag(questionId, tagId);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('questions/:questionId/tags')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'List tags linked to a question' })
  @ApiOkResponse({ type: [QuestionTagResponseDto], isArray: true })
  async listTagsByQuestion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
  ): Promise<QuestionTagResponseDto[]> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.questionTagService.listTagsByQuestion(questionId);

      return snapshots.map(toQuestionTagResponse);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Post('questions/:questionId/curriculum-links')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a curriculum link for a question' })
  @ApiCreatedResponse({ type: QuestionCurriculumLinkResponseDto })
  async createCurriculumLink(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Body() request: CreateQuestionCurriculumLinkRequestDto,
  ): Promise<QuestionCurriculumLinkResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionCurriculumLinkService.createLink(questionId, {
        curriculumId: request.curriculumId,
        canonicalLessonKey: request.canonicalLessonKey,
        authoringCurriculumVersionId: request.authoringCurriculumVersionId,
      });

      return toQuestionCurriculumLinkResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('questions/:questionId/curriculum-links')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'List curriculum links for a question' })
  @ApiOkResponse({ type: QuestionCurriculumLinkListResponseDto })
  async listCurriculumLinksByQuestion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('questionId') questionId: string,
  ): Promise<QuestionCurriculumLinkListResponseDto> {
    try {
      const parishId = await this.questionBankService.getQuestionParishId(questionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshots = await this.questionCurriculumLinkService.listLinksByQuestion(questionId);

      return toQuestionCurriculumLinkListResponse(snapshots);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Delete('question-curriculum-links/:linkId')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question curriculum link' })
  @ApiNoContentResponse({ description: 'Curriculum link deleted successfully' })
  async deleteCurriculumLink(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('linkId') linkId: string,
  ): Promise<void> {
    try {
      const link = await this.questionCurriculumLinkService.getLinkById(linkId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, link.parishId);

      await this.questionCurriculumLinkService.deleteLink(linkId);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }
}
