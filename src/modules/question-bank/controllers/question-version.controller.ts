import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { QuestionVersionResponseDto } from '../dto/question-version-response.dto';
import { UpdateQuestionVersionRequestDto } from '../dto/update-question-version-request.dto';
import { toQuestionVersionResponse } from '../mappers/question-bank-response.mapper';
import { QuestionBankService } from '../services/question-bank.service';
import { rethrowQuestionBankServiceError } from '../utils/question-http.util';

@ApiTags('question-versions')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class QuestionVersionController {
  constructor(
    private readonly questionBankService: QuestionBankService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Get('question-versions/:versionId')
  @RequirePermissions(QUESTION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get a question version by id' })
  @ApiOkResponse({ type: QuestionVersionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.read permission or parish scope' })
  async getVersionById(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
  ): Promise<QuestionVersionResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanReadParishAsAdmin(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.getVersionById(versionId);

      return toQuestionVersionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }

  @Patch('question-versions/:versionId')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Update a draft question version' })
  @ApiOkResponse({ type: QuestionVersionResponseDto })
  async updateDraftVersion(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('versionId') versionId: string,
    @Body() request: UpdateQuestionVersionRequestDto,
  ): Promise<QuestionVersionResponseDto> {
    try {
      const parishId = await this.questionBankService.getVersionQuestionParishId(versionId);
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const snapshot = await this.questionBankService.updateDraftVersion(versionId, {
        questionType: request.questionType,
        prompt: request.prompt,
        instruction: request.instruction,
        explanation: request.explanation,
        difficulty: request.difficulty,
        promptMediaJson: request.promptMediaJson,
        explanationMediaJson: request.explanationMediaJson,
      });

      return toQuestionVersionResponse(snapshot);
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }
}
