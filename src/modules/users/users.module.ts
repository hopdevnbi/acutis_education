import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { PasswordHashService } from './services/password-hash.service';
import { UserAccountService } from './services/user-account.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [PasswordHashService, UserAccountService],
  exports: [UserAccountService],
})
export class UsersModule {}
