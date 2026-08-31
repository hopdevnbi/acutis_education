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
import { CreateQuestionTagRequestDto } from '../dto/create-question-tag-request.dto';
import { QuestionTagListQueryDto } from '../dto/question-tag-list-query.dto';
import { QuestionTagListResponseDto } from '../dto/question-tag-list-response.dto';
import { QuestionTagResponseDto } from '../dto/question-tag-response.dto';
import { UpdateQuestionTagRequestDto } from '../dto/update-question-tag-request.dto';
import { UpdateQuestionTagStatusRequestDto } from '../dto/update-question-tag-status-request.dto';
import {
  toQuestionTagListResponse,
  toQuestionTagResponse,
} from '../mappers/question-bank-response.mapper';
import { QuestionTagService } from '../services/question-tag.service';
import { rethrowQuestionBankServiceError } from '../utils/question-http.util';

@ApiTags('question-tags')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class QuestionTagController {
  constructor(
    private readonly questionTagService: QuestionTagService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('parishes/:parishId/question-tags')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a question tag for a parish' })
  @ApiCreatedResponse({ type: QuestionTagResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.manage permission or parish scope' })
  async createTag(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Body() request: CreateQuestionTagRequestDto,
  ): Promise<QuestionTagResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionTagService.createTag(parishId, {
        code: request.code,
        name: request.name,
      });

      return toQuestionTagResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('parishes/:parishId/question-tags')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'List question tags for a parish' })
  @ApiOkResponse({ type: QuestionTagListResponseDto })
  async listTagsByParish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Query() query: QuestionTagListQueryDto,
  ): Promise<QuestionTagListResponseDto> {
    try {
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const result = await this.questionTagService.listTagsByParish(parishId, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sort: query.sort,
        status: query.status,
        search: query.search,
      });

      return toQuestionTagListResponse(result);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Get('question-tags/:tagId')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a question tag by id' })
  @ApiOkResponse({ type: QuestionTagResponseDto })
  async getTagById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('tagId') tagId: string,
  ): Promise<QuestionTagResponseDto> {
    try {
      const tag = await this.questionTagService.getTagById(tagId);
      await this.parishScopeService.assertCanReadParishAsAdmin(
        authenticatedUser.userId,
        tag.parishId,
      );

      return toQuestionTagResponse(tag);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Patch('question-tags/:tagId')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update question tag metadata' })
  @ApiOkResponse({ type: QuestionTagResponseDto })
  async updateTag(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('tagId') tagId: string,
    @Body() request: UpdateQuestionTagRequestDto,
  ): Promise<QuestionTagResponseDto> {
    if (request.code === undefined && request.name === undefined) {
      throw new BadRequestException('At least one tag field must be provided for update.');
    }

    try {
      const tag = await this.questionTagService.getTagById(tagId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, tag.parishId);

      const snapshot = await this.questionTagService.updateTag(tagId, {
        code: request.code,
        name: request.name,
      });

      return toQuestionTagResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Patch('question-tags/:tagId/status')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update question tag lifecycle status' })
  @ApiOkResponse({ type: QuestionTagResponseDto })
  async updateTagStatus(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('tagId') tagId: string,
    @Body() request: UpdateQuestionTagStatusRequestDto,
  ): Promise<QuestionTagResponseDto> {
    try {
      const tag = await this.questionTagService.getTagById(tagId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, tag.parishId);

      const snapshot = await this.questionTagService.updateTagStatus(tagId, request.status);

      return toQuestionTagResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }
}
