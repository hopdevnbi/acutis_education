import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { RoleEntity } from './entities/role.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { PermissionGuard } from './guards/permission.guard';
import { AccessControlService } from './services/access-control.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, UserRoleEntity, RolePermissionEntity]),
  ],
  providers: [AccessControlService, PermissionGuard, Reflector],
  exports: [AccessControlService, PermissionGuard],
})
export class AccessControlModule {}
