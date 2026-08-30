import { UserEntity } from '../entities/user.entity';
import type {
  AuthenticatedAccountSnapshot,
  UserAccountSnapshot,
} from '../interfaces/user-account-snapshot.interface';

export function toUserAccountSnapshot(entity: UserEntity): UserAccountSnapshot {
  return {
    id: entity.id,
    email: entity.email,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toAuthenticatedAccountSnapshot(entity: UserEntity): AuthenticatedAccountSnapshot {
  return {
    id: entity.id,
    email: entity.email,
    status: entity.status,
  };
}
