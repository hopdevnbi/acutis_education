import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  LOCALIZATION_BULK_THROTTLE_NAME,
  LOCALIZATION_BULK_THROTTLE_LIMIT,
  LOCALIZATION_BULK_THROTTLE_TTL_MS,
  LOCALIZATION_REQUEST_THROTTLE_NAME,
  LOCALIZATION_REQUEST_THROTTLE_LIMIT,
  LOCALIZATION_REQUEST_THROTTLE_TTL_MS,
  LOCALIZATION_RETRY_THROTTLE_NAME,
  LOCALIZATION_RETRY_THROTTLE_LIMIT,
  LOCALIZATION_RETRY_THROTTLE_TTL_MS,
} from '../constants/localization-admin.constants';
import {
  LOCALIZATION_APPROVE_PERMISSION,
  LOCALIZATION_MANAGE_PERMISSION,
  LOCALIZATION_READ_PERMISSION,
} from '../constants/localization-permissions.constants';
import {
  BulkTranslationRequestDto,
  LocalizationJobListQueryDto,
  LocalizationPreviewQueryDto,
  LocalizationResourceDetailQueryDto,
  LocalizationResourceListQueryDto,
  RequestTranslationRequestDto,
  ReviewTranslationRevisionRequestDto,
  SyncTranslationResourceRequestDto,
} from '../dto/localization-admin-request.dto';
import {
  BulkTranslationResponseDto,
  LocalizationPreviewResponseDto,
  RequestTranslationResponseDto,
  TranslationJobListResponseDto,
  TranslationJobSummaryResponseDto,
  TranslationResourceDetailResponseDto,
  TranslationResourceListResponseDto,
  TranslationResourceSummaryResponseDto,
  TranslationRevisionDetailResponseDto,
  TranslationRevisionSummaryResponseDto,
} from '../dto/localization-admin-response.dto';
import {
  toBulkTranslationResponse,
  toLocalizationPreviewResponse,
  toRequestTranslationResponse,
  toTranslationJobListResponse,
  toTranslationJobSummaryResponse,
  toTranslationResourceDetailResponse,
  toTranslationResourceListResponse,
  toTranslationResourceSummaryResponse,
  toTranslationRevisionDetailResponse,
  toTranslationRevisionSummaryResponse,
} from '../mappers/localization-admin-response.mapper';
import { LocalizationAdminService } from '../services/localization-admin.service';
import { rethrowLocalizationServiceError } from '../utils/localization-http.util';

@ApiTags('localization')
@Controller('localization')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class LocalizationController {
  constructor(private readonly localizationAdminService: LocalizationAdminService) {}

  @Get('resources')
  @RequirePermissions(LOCALIZATION_READ_PERMISSION)
  @ApiOperation({ summary: 'List translation resources with optional filters' })
  @ApiOkResponse({ type: TranslationResourceListResponseDto })
  async listResources(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: LocalizationResourceListQueryDto,
  ): Promise<TranslationResourceListResponseDto> {
    try {
      const result = await this.localizationAdminService.listResources(authenticatedUser.userId, {
        page: query.page,
        limit: query.limit,
        resourceType: query.resourceType,
        sourceLocale: query.sourceLocale,
        targetLocale: query.targetLocale,
        translationStatus: query.translationStatus,
        parishId: query.parishId,
      });

      return toTranslationResourceListResponse(result);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Get('resources/:id')
  @RequirePermissions(LOCALIZATION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get translation resource detail' })
  @ApiOkResponse({ type: TranslationResourceDetailResponseDto })
  async getResourceDetail(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') translationResourceId: string,
    @Query() query: LocalizationResourceDetailQueryDto,
  ): Promise<TranslationResourceDetailResponseDto> {
    try {
      const detail = await this.localizationAdminService.getResourceDetail(
        authenticatedUser.userId,
        translationResourceId,
        query.targetLocale,
      );

      return toTranslationResourceDetailResponse(detail);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('resources/sync')
  @RequirePermissions(LOCALIZATION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Discover and bind a translation resource from source content' })
  @ApiCreatedResponse({ type: TranslationResourceSummaryResponseDto })
  async syncResource(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() request: SyncTranslationResourceRequestDto,
  ): Promise<TranslationResourceSummaryResponseDto> {
    try {
      const resource = await this.localizationAdminService.syncResource(authenticatedUser.userId, {
        resourceType: request.resourceType,
        resourceId: request.resourceId,
      });

      return toTranslationResourceSummaryResponse(resource);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('resources/:id/translations')
  @RequirePermissions(LOCALIZATION_MANAGE_PERMISSION)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    [LOCALIZATION_REQUEST_THROTTLE_NAME]: {
      limit: LOCALIZATION_REQUEST_THROTTLE_LIMIT,
      ttl: LOCALIZATION_REQUEST_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({ summary: 'Queue a translation job for a resource' })
  @ApiOkResponse({ type: RequestTranslationResponseDto })
  @ApiCreatedResponse({ type: RequestTranslationResponseDto })
  async requestTranslation(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') translationResourceId: string,
    @Body() request: RequestTranslationRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RequestTranslationResponseDto> {
    try {
      const result = await this.localizationAdminService.requestTranslation({
        userId: authenticatedUser.userId,
        translationResourceId,
        targetLocale: request.targetLocale,
        providerId: request.providerId,
      });
      response.status(result.httpStatus);

      return toRequestTranslationResponse(result);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('bulk-translations')
  @RequirePermissions(LOCALIZATION_MANAGE_PERMISSION)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    [LOCALIZATION_BULK_THROTTLE_NAME]: {
      limit: LOCALIZATION_BULK_THROTTLE_LIMIT,
      ttl: LOCALIZATION_BULK_THROTTLE_TTL_MS,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Queue translation jobs for multiple resources' })
  @ApiOkResponse({ type: BulkTranslationResponseDto })
  async bulkRequestTranslation(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Body() request: BulkTranslationRequestDto,
  ): Promise<BulkTranslationResponseDto> {
    try {
      const result = await this.localizationAdminService.bulkRequestTranslation({
        userId: authenticatedUser.userId,
        translationResourceIds: request.translationResourceIds,
        targetLocale: request.targetLocale,
        providerId: request.providerId,
      });

      return toBulkTranslationResponse(result);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Get('revisions/:revisionId')
  @RequirePermissions(LOCALIZATION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get translation revision detail' })
  @ApiOkResponse({ type: TranslationRevisionDetailResponseDto })
  async getRevisionDetail(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('revisionId') revisionId: string,
  ): Promise<TranslationRevisionDetailResponseDto> {
    try {
      const detail = await this.localizationAdminService.getRevisionDetail(
        authenticatedUser.userId,
        revisionId,
      );

      return toTranslationRevisionDetailResponse(detail);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('revisions/:revisionId/review')
  @RequirePermissions(LOCALIZATION_MANAGE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a reviewed revision from a human-edited payload' })
  @ApiCreatedResponse({ type: TranslationRevisionSummaryResponseDto })
  async reviewRevision(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('revisionId') revisionId: string,
    @Body() request: ReviewTranslationRevisionRequestDto,
  ): Promise<TranslationRevisionSummaryResponseDto> {
    try {
      const revision = await this.localizationAdminService.reviewRevision({
        userId: authenticatedUser.userId,
        revisionId,
        payload: request.payload,
      });

      return toTranslationRevisionSummaryResponse(revision);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('revisions/:revisionId/approve')
  @RequirePermissions(LOCALIZATION_APPROVE_PERMISSION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Approve a machine-translated or reviewed revision' })
  @ApiCreatedResponse({ type: TranslationRevisionSummaryResponseDto })
  async approveRevision(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('revisionId') revisionId: string,
  ): Promise<TranslationRevisionSummaryResponseDto> {
    try {
      const revision = await this.localizationAdminService.approveRevision({
        userId: authenticatedUser.userId,
        revisionId,
      });

      return toTranslationRevisionSummaryResponse(revision);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Get('jobs')
  @RequirePermissions(LOCALIZATION_READ_PERMISSION)
  @ApiOperation({ summary: 'List translation jobs' })
  @ApiOkResponse({ type: TranslationJobListResponseDto })
  async listJobs(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Query() query: LocalizationJobListQueryDto,
  ): Promise<TranslationJobListResponseDto> {
    try {
      const result = await this.localizationAdminService.listJobs(authenticatedUser.userId, {
        page: query.page,
        limit: query.limit,
        translationResourceId: query.translationResourceId,
        targetLocale: query.targetLocale,
        status: query.status,
      });

      return toTranslationJobListResponse(result);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Get('jobs/:jobId')
  @RequirePermissions(LOCALIZATION_READ_PERMISSION)
  @ApiOperation({ summary: 'Get translation job detail' })
  @ApiOkResponse({ type: TranslationJobSummaryResponseDto })
  async getJobDetail(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ): Promise<TranslationJobSummaryResponseDto> {
    try {
      const job = await this.localizationAdminService.getJobDetail(authenticatedUser.userId, jobId);

      return toTranslationJobSummaryResponse(job);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Post('jobs/:jobId/retry')
  @RequirePermissions(LOCALIZATION_MANAGE_PERMISSION)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    [LOCALIZATION_RETRY_THROTTLE_NAME]: {
      limit: LOCALIZATION_RETRY_THROTTLE_LIMIT,
      ttl: LOCALIZATION_RETRY_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({ summary: 'Retry a failed or dead translation job' })
  @ApiOkResponse({ type: RequestTranslationResponseDto })
  @ApiCreatedResponse({ type: RequestTranslationResponseDto })
  async retryJob(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RequestTranslationResponseDto> {
    try {
      const result = await this.localizationAdminService.retryJob(authenticatedUser.userId, jobId);
      response.status(result.httpStatus);

      return toRequestTranslationResponse(result);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }

  @Get('resources/:id/preview')
  @RequirePermissions(LOCALIZATION_READ_PERMISSION)
  @ApiOperation({ summary: 'Preview localized resource content without calling a provider' })
  @ApiOkResponse({ type: LocalizationPreviewResponseDto })
  async previewResource(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Param('id') translationResourceId: string,
    @Query() query: LocalizationPreviewQueryDto,
  ): Promise<LocalizationPreviewResponseDto> {
    try {
      const preview = await this.localizationAdminService.previewResource({
        userId: authenticatedUser.userId,
        translationResourceId,
        locale: query.locale,
      });

      return toLocalizationPreviewResponse(preview);
    } catch (error: unknown) {
      rethrowLocalizationServiceError(error);
    }
  }
}
