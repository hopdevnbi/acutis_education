import type { AccessTokenResponseDto } from '../dto/access-token-response.dto';
import type { LoginResponseDto } from '../dto/login-response.dto';

export interface AuthenticatedLoginResult {
  readonly loginResponse: LoginResponseDto;
  readonly rawRefreshToken: string;
}

export interface AuthenticatedRefreshResult {
  readonly accessTokenResponse: AccessTokenResponseDto;
  readonly rawRefreshToken: string;
}
