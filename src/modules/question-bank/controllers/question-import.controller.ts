import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
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
import { QUESTION_MANAGE_PERMISSION } from '../constants/question-permissions.constants';
import { QuestionExportPackageV1Dto } from '../dto/question-export-package-v1.dto';
import { QuestionImportValidationResponseDto } from '../dto/question-import-validation-response.dto';
import { toQuestionExportPackageResponse } from '../mappers/question-bank-response.mapper';
import { QuestionBankService } from '../services/question-bank.service';
import { rethrowQuestionBankServiceError } from '../utils/question-http.util';

@ApiTags('question-imports')
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class QuestionImportController {
  constructor(
    private readonly questionBankService: QuestionBankService,
    private readonly parishScopeService: ParishScopeService,
  ) {}

  @Post('parishes/:parishId/question-imports/validate')
  @RequirePermissions(QUESTION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a question export package for import (no database writes)',
    description:
      'Validate-only import contract. Resolves tag codes, curriculum semantics, and media readiness without persisting changes.',
  })
  @ApiOkResponse({ type: QuestionImportValidationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing questions.manage permission or parish scope' })
  async validateImport(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('parishId') parishId: string,
    @Body() request: QuestionExportPackageV1Dto,
  ): Promise<QuestionImportValidationResponseDto> {
    try {
      await this.parishScopeService.assertCanManageParish(authenticatedUser.userId, parishId);

      const result = await this.questionBankService.validateQuestionImport(parishId, request);

      return {
        valid: result.valid,
        issues: result.issues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
          severity: issue.severity,
        })),
        normalizedPreview:
          result.normalizedPreview === undefined
            ? undefined
            : (toQuestionExportPackageResponse(
                result.normalizedPreview,
              ) as QuestionExportPackageV1Dto),
      };
    } catch (error: unknown) {
      rethrowQuestionBankServiceError(error);
    }
  }
}
