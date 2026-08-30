import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import authConfiguration from './config/auth.configuration';
import { AUTH_CONFIGURATION_NAMESPACE, type AuthConfiguration } from './config/auth.config.types';
import { AuthController } from './controllers/auth.controller';
import { AuthSessionEntity } from './entities/auth-session.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessTokenService } from './services/access-token.service';
import { AuthSessionService } from './services/auth-session.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    UsersModule,
    ConfigModule.forFeature(authConfiguration),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(authConfiguration)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfigurationValue = configService.get<AuthConfiguration>(
          AUTH_CONFIGURATION_NAMESPACE,
        );

        if (authConfigurationValue === undefined) {
          throw new Error('Auth configuration is not available.');
        }

        return {
          secret: authConfigurationValue.accessSecret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: authConfigurationValue.accessExpiresInSeconds,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([AuthSessionEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AccessTokenService,
    AuthService,
    AuthSessionService,
    JwtAuthGuard,
    RefreshTokenService,
  ],
  exports: [JwtAuthGuard, AccessTokenService],
})
export class AuthModule {}
