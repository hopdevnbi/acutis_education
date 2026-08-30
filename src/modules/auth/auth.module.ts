import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSessionEntity } from './entities/auth-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuthSessionEntity])],
  exports: [TypeOrmModule],
})
export class AuthModule {}
