import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { SUPER_ADMIN_ROLE_CODE } from '../../access-control/constants/role-codes.constants';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { LocalizationAccessDeniedError } from '../errors/localization-admin.errors';
import { CatholicGlossaryService } from '../services/catholic-glossary.service';
import {
  AddGlossaryTermRequestDto,
  CloneGlossaryDraftRequestDto,
  CreateGlossaryDraftRequestDto,
  UpdateGlossaryTermRequestDto,
} from '../dto/localization-glossary-request.dto';
import { rethrowLocalizationServiceError } from '../utils/localization-http.util';

@ApiTags('localization-glossaries')
@Controller('localization/glossaries')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class LocalizationGlossaryController {
  constructor(
    private readonly catholicGlossaryService: CatholicGlossaryService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Catholic glossary draft version (super admin only)' })
  @ApiCreatedResponse({ description: 'Glossary draft created' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Super admin only' })
  async createDraft(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() request: CreateGlossaryDraftRequestDto,
  ): Promise<unknown> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);

      return this.catholicGlossaryService.createDraft({
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        createdByUserId: authenticatedUser.userId,
      });
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('clone')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clone a published glossary into a new draft (super admin only)' })
  async clonePublishedToDraft(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() request: CloneGlossaryDraftRequestDto,
  ): Promise<unknown> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);

      return this.catholicGlossaryService.clonePublishedToDraft({
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        createdByUserId: authenticatedUser.userId,
      });
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post(':glossaryVersionId/terms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a term to a draft glossary version (super admin only)' })
  async addTerm(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('glossaryVersionId') glossaryVersionId: string,
    @Body() request: AddGlossaryTermRequestDto,
  ): Promise<unknown> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);

      return this.catholicGlossaryService.addTerm({
        glossaryVersionId,
        sourceTerm: request.sourceTerm,
        targetTerm: request.targetTerm,
        notes: request.notes,
        caseSensitive: request.caseSensitive,
      });
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Patch('terms/:termId')
  @ApiOperation({ summary: 'Update a glossary term on a draft version (super admin only)' })
  async updateTerm(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('termId') termId: string,
    @Body() request: UpdateGlossaryTermRequestDto,
  ): Promise<unknown> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);

      return this.catholicGlossaryService.updateTerm({
        termId,
        sourceTerm: request.sourceTerm,
        targetTerm: request.targetTerm,
        notes: request.notes,
        caseSensitive: request.caseSensitive,
      });
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Delete('terms/:termId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a glossary term from a draft version (super admin only)' })
  async deleteTerm(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('termId') termId: string,
  ): Promise<void> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);
      await this.catholicGlossaryService.deleteTerm(termId);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post(':glossaryVersionId/publish')
  @ApiOperation({ summary: 'Publish a glossary draft version (super admin only)' })
  async publish(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('glossaryVersionId') glossaryVersionId: string,
  ): Promise<unknown> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);

      return this.catholicGlossaryService.publish({
        glossaryVersionId,
        publishedByUserId: authenticatedUser.userId,
      });
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Get(':glossaryVersionId/terms')
  @ApiOperation({ summary: 'List terms for a glossary version (super admin only)' })
  async listTerms(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('glossaryVersionId') glossaryVersionId: string,
  ): Promise<unknown> {
    try {
      await this.assertSuperAdmin(authenticatedUser.userId);

      return this.catholicGlossaryService.listTermsForVersion(glossaryVersionId);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  private async assertSuperAdmin(userId: string): Promise<void> {
    const roles = await this.accessControlService.getRolesForUser(userId);

    if (!roles.some((role) => role.code === SUPER_ADMIN_ROLE_CODE)) {
      throw new LocalizationAccessDeniedError();
    }
  }
}
