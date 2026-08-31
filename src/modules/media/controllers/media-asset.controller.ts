import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Res } from '@nestjs/common';
import { RequirePermissions } from '../../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../access-control/guards/permission.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  MEDIA_READ_PERMISSION,
  MEDIA_UPLOAD_PERMISSION,
} from '../constants/media-permissions.constants';
import {
  MEDIA_UPLOAD_THROTTLE_LIMIT,
  MEDIA_UPLOAD_THROTTLE_TTL_MS,
  MULTIPART_UPLOAD_MAX_BYTES,
} from '../constants/media-upload.constants';
import { MediaConfigService } from '../config/media-config.service';
import { MediaAssetResponseDto } from '../dto/media-asset-response.dto';
import { UploadMediaAssetRequestDto } from '../dto/upload-media-asset-request.dto';
import { MediaVisibility } from '../enums/media-visibility.enum';
import {
  MediaUploadFileMissingError,
  MediaUploadTooLargeError,
} from '../errors/media-asset.errors';
import {
  buildContentDispositionHeader,
  toMediaAssetResponseDto,
} from '../mappers/media-asset-response.mapper';
import { MediaAccessService } from '../services/media-access.service';
import { MediaAssetService } from '../services/media-asset.service';
import { rethrowMediaServiceError } from '../utils/media-http.util';

@ApiTags('media')
@Controller('media/assets')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('access-token')
export class MediaAssetController {
  constructor(
    private readonly mediaAssetService: MediaAssetService,
    private readonly mediaAccessService: MediaAccessService,
    private readonly mediaConfigService: MediaConfigService,
  ) {}

  @Post()
  @RequirePermissions(MEDIA_UPLOAD_PERMISSION)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    'media-upload': {
      limit: MEDIA_UPLOAD_THROTTLE_LIMIT,
      ttl: MEDIA_UPLOAD_THROTTLE_TTL_MS,
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MULTIPART_UPLOAD_MAX_BYTES,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'intendedCategory'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        intendedCategory: {
          type: 'string',
          enum: ['IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO'],
        },
        visibility: {
          type: 'string',
          enum: ['PRIVATE', 'AUTHENTICATED', 'PUBLIC'],
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a media asset (IMAGE or DOCUMENT only)' })
  @ApiCreatedResponse({ type: MediaAssetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing media.upload permission' })
  @ApiPayloadTooLargeResponse({ description: 'Uploaded file exceeds configured size limits' })
  @ApiUnsupportedMediaTypeResponse({ description: 'Unsupported or mismatched file type' })
  @ApiServiceUnavailableResponse({ description: 'Storage provider write failed' })
  async uploadAsset(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() request: UploadMediaAssetRequestDto,
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    try {
      if (file === undefined) {
        throw new MediaUploadFileMissingError();
      }

      const globalMaxBytes = this.mediaConfigService.getConfiguration().sizeLimits.globalMaxBytes;

      if (file.size > globalMaxBytes) {
        throw new MediaUploadTooLargeError();
      }

      const snapshot = await this.mediaAssetService.createFromUpload({
        fileBuffer: file.buffer,
        originalFileName: file.originalname,
        intendedCategory: request.intendedCategory,
        visibility: request.visibility ?? MediaVisibility.Private,
        createdByUserId: authenticatedUser.userId,
      });

      return toMediaAssetResponseDto(snapshot);
    } catch (error: unknown) {
      rethrowMediaServiceError(error);
    }
  }

  @Get(':id')
  @RequirePermissions(MEDIA_READ_PERMISSION)
  @ApiOperation({ summary: 'Get safe media asset metadata' })
  @ApiOkResponse({ type: MediaAssetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing permission or asset access denied' })
  @ApiNotFoundResponse({ description: 'Media asset not found' })
  async getAssetMetadata(
    @Param('id', ParseUUIDPipe) assetId: string,
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    try {
      const accessRecord = await this.mediaAccessService.getReadableAssetRecord(
        assetId,
        authenticatedUser.userId,
      );

      return toMediaAssetResponseDto(accessRecord.snapshot);
    } catch (error: unknown) {
      rethrowMediaServiceError(error);
    }
  }

  @Get(':id/content')
  @RequirePermissions(MEDIA_READ_PERMISSION)
  @ApiOperation({ summary: 'Stream media asset binary content (admin/uploader only)' })
  @ApiOkResponse({ description: 'Binary media content stream' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Missing permission or asset access denied' })
  @ApiNotFoundResponse({ description: 'Media asset not found' })
  async getAssetContent(
    @Param('id', ParseUUIDPipe) assetId: string,
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    try {
      await this.mediaAccessService.getReadableAssetRecord(assetId, authenticatedUser.userId);

      const content = await this.mediaAssetService.openAssetContent(assetId);

      response.setHeader('Content-Type', content.snapshot.mimeType);
      response.setHeader('Content-Length', String(content.contentLength));
      response.setHeader(
        'Content-Disposition',
        buildContentDispositionHeader(content.snapshot.originalFileName, content.snapshot.mimeType),
      );
      response.setHeader('Cache-Control', 'private, no-store');

      return new StreamableFile(content.body);
    } catch (error: unknown) {
      rethrowMediaServiceError(error);
    }
  }
}
