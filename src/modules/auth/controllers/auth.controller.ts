import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppConfigService } from '../../../config/app-config.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AccessTokenResponseDto } from '../dto/access-token-response.dto';
import { AuthenticatedProfileResponseDto } from '../dto/authenticated-profile-response.dto';
import { LoginRequestDto } from '../dto/login-request.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthService } from '../services/auth.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils/auth-cookie.util';
import {
  createInvalidCredentialsException,
  extractRefreshTokenFromRequest,
} from '../utils/auth-http.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfigService: AppConfigService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({
    type: LoginResponseDto,
    description:
      'Returns an access token in JSON and sets an HttpOnly refresh-token cookie scoped to /api/v1/auth.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() loginRequest: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const loginResult = await this.authService.login(loginRequest.email, loginRequest.password);

    setRefreshTokenCookie(response, loginResult.rawRefreshToken, {
      nodeEnv: this.appConfigService.getNodeEnv(),
      maxAgeSeconds: this.refreshTokenService.getRefreshTokenExpiresInSeconds(),
    });

    return loginResult.loginResponse;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
    description: 'Reads the HttpOnly refresh-token cookie set by login.',
  })
  @ApiOkResponse({
    type: AccessTokenResponseDto,
    description: 'Returns a new access token and rotates the HttpOnly refresh-token cookie.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async refreshAccessToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    const rawRefreshToken = extractRefreshTokenFromRequest(request);

    if (rawRefreshToken === null) {
      throw createInvalidCredentialsException();
    }

    const refreshResult = await this.authService.refreshAccessToken(rawRefreshToken);

    setRefreshTokenCookie(response, refreshResult.rawRefreshToken, {
      nodeEnv: this.appConfigService.getNodeEnv(),
      maxAgeSeconds: this.refreshTokenService.getRefreshTokenExpiresInSeconds(),
    });

    return refreshResult.accessTokenResponse;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke the current browser session and clear refresh cookie' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async logout(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(authenticatedUser.sessionId);
    clearRefreshTokenCookie(response, this.appConfigService.getNodeEnv());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return the authenticated account profile' })
  @ApiOkResponse({ type: AuthenticatedProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  getAuthenticatedProfile(
    @CurrentUser() authenticatedUser: AuthenticatedUser,
  ): Promise<AuthenticatedProfileResponseDto> {
    return this.authService.getAuthenticatedProfile(authenticatedUser.userId);
  }
}
