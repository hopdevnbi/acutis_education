import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import {
  PermissionCodeAlreadyExistsError,
  PermissionNotFoundError,
  RoleCodeAlreadyExistsError,
  RoleNotFoundError,
  UserNotFoundForRoleAssignmentError,
} from '../errors/access-control.errors';
import type { CreatePermissionInput } from '../interfaces/create-permission-input.interface';
import type { CreateRoleInput } from '../interfaces/create-role-input.interface';
import type { PermissionSnapshot } from '../interfaces/permission-snapshot.interface';
import type { RoleSnapshot } from '../interfaces/role-snapshot.interface';
import { toPermissionSnapshot } from '../mappers/permission.mapper';
import { toRoleSnapshot } from '../mappers/role.mapper';
import {
  isValidPermissionName,
  normalizePermissionName,
  parsePermissionCode,
} from '../utils/permission-code.util';
import { isValidRoleName, normalizeRoleName, parseRoleCode } from '../utils/role-code.util';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 2627 || driverError.number === 2601;
}

function isForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { number?: number };

  return driverError.number === 547;
}

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
  ) {}

  async createRole(input: CreateRoleInput): Promise<RoleSnapshot> {
    const code = parseRoleCode(input.code);
    const name = normalizeRoleName(input.name);

    if (!isValidRoleName(name)) {
      throw new Error('Role name is invalid.');
    }

    const role = this.roleRepository.create({
      code,
      name,
      description: input.description ?? null,
    });

    try {
      const savedRole = await this.roleRepository.save(role);

      return toRoleSnapshot(savedRole);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new RoleCodeAlreadyExistsError(code);
      }

      throw error;
    }
  }

  async createPermission(input: CreatePermissionInput): Promise<PermissionSnapshot> {
    const code = parsePermissionCode(input.code);
    const name = normalizePermissionName(input.name);

    if (!isValidPermissionName(name)) {
      throw new Error('Permission name is invalid.');
    }

    const permission = this.permissionRepository.create({
      code,
      name,
      description: input.description ?? null,
    });

    try {
      const savedPermission = await this.permissionRepository.save(permission);

      return toPermissionSnapshot(savedPermission);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        throw new PermissionCodeAlreadyExistsError(code);
      }

      throw error;
    }
  }

  async assignRoleToUser(userId: string, rawRoleCode: string): Promise<void> {
    const normalizedUserId = normalizeUuid(userId);
    const role = await this.findRoleByCodeOrThrow(rawRoleCode);
    const existingAssignment = await this.userRoleRepository.findOne({
      where: {
        userId: normalizedUserId,
        roleId: role.id,
      },
    });

    if (existingAssignment !== null) {
      return;
    }

    try {
      await this.userRoleRepository.save({
        userId: normalizedUserId,
        roleId: role.id,
      });
    } catch (error: unknown) {
      if (isForeignKeyViolation(error)) {
        throw new UserNotFoundForRoleAssignmentError();
      }

      throw error;
    }
  }

  async removeRoleFromUser(userId: string, rawRoleCode: string): Promise<void> {
    const normalizedUserId = normalizeUuid(userId);
    const role = await this.findRoleByCodeOrThrow(rawRoleCode);

    await this.userRoleRepository.delete({
      userId: normalizedUserId,
      roleId: role.id,
    });
  }

  async assignPermissionToRole(rawRoleCode: string, rawPermissionCode: string): Promise<void> {
    const role = await this.findRoleByCodeOrThrow(rawRoleCode);
    const permission = await this.findPermissionByCodeOrThrow(rawPermissionCode);
    const existingAssignment = await this.rolePermissionRepository.findOne({
      where: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    if (existingAssignment !== null) {
      return;
    }

    await this.rolePermissionRepository.save({
      roleId: role.id,
      permissionId: permission.id,
    });
  }

  async removePermissionFromRole(rawRoleCode: string, rawPermissionCode: string): Promise<void> {
    const role = await this.findRoleByCodeOrThrow(rawRoleCode);
    const permission = await this.findPermissionByCodeOrThrow(rawPermissionCode);

    await this.rolePermissionRepository.delete({
      roleId: role.id,
      permissionId: permission.id,
    });
  }

  async getRolesForUser(userId: string): Promise<RoleSnapshot[]> {
    const normalizedUserId = normalizeUuid(userId);
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .innerJoin(UserRoleEntity, 'userRole', 'userRole.roleId = role.id')
      .where('userRole.userId = :userId', { userId: normalizedUserId })
      .orderBy('role.code', 'ASC')
      .getMany();

    return roles.map((role) => toRoleSnapshot(role));
  }

  async getEffectivePermissions(userId: string): Promise<string[]> {
    const normalizedUserId = normalizeUuid(userId);
    const permissionRows = await this.permissionRepository
      .createQueryBuilder('permission')
      .innerJoin(
        RolePermissionEntity,
        'rolePermission',
        'rolePermission.permissionId = permission.id',
      )
      .innerJoin(RoleEntity, 'role', 'role.id = rolePermission.roleId')
      .innerJoin(UserRoleEntity, 'userRole', 'userRole.roleId = role.id')
      .where('userRole.userId = :userId', { userId: normalizedUserId })
      .select('permission.code', 'code')
      .distinct(true)
      .orderBy('permission.code', 'ASC')
      .getRawMany<{ code: string }>();

    return permissionRows.map((row) => row.code);
  }

  async userHasPermission(userId: string, rawPermissionCode: string): Promise<boolean> {
    const permissionCode = parsePermissionCode(rawPermissionCode);
    const effectivePermissions = await this.getEffectivePermissions(userId);

    return effectivePermissions.includes(permissionCode);
  }

  private async findRoleByCodeOrThrow(rawRoleCode: string): Promise<RoleEntity> {
    const roleCode = parseRoleCode(rawRoleCode);
    const role = await this.roleRepository.findOne({
      where: { code: roleCode },
    });

    if (role === null) {
      throw new RoleNotFoundError(roleCode);
    }

    return role;
  }

  private async findPermissionByCodeOrThrow(rawPermissionCode: string): Promise<PermissionEntity> {
    const permissionCode = parsePermissionCode(rawPermissionCode);
    const permission = await this.permissionRepository.findOne({
      where: { code: permissionCode },
    });

    if (permission === null) {
      throw new PermissionNotFoundError(permissionCode);
    }

    return permission;
  }
}
