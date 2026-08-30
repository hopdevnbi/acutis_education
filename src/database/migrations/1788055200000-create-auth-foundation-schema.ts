import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuthFoundationSchema1788055200000 implements MigrationInterface {
  name = 'CreateAuthFoundationSchema1788055200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            default: 'NEWSEQUENTIALID()',
          },
          {
            name: 'email',
            type: 'nvarchar',
            length: '320',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'nvarchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'UQ_users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            default: 'NEWSEQUENTIALID()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'UQ_roles_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            default: 'NEWSEQUENTIALID()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'UQ_permissions_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'auth_sessions',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            default: 'NEWSEQUENTIALID()',
          },
          {
            name: 'user_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'refresh_token_hash',
            type: 'nvarchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'token_family_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETUTCDATE()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'auth_sessions',
      new TableIndex({
        name: 'IDX_auth_sessions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'auth_sessions',
      new TableIndex({
        name: 'IDX_auth_sessions_token_family_id',
        columnNames: ['token_family_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'auth_sessions',
      new TableForeignKey({
        name: 'FK_auth_sessions_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'user_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'role_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_role_id_roles_id',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'role_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'permission_id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_role_permissions_role_id_roles_id',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'FK_role_permissions_permission_id_permissions_id',
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissions', true);
    await queryRunner.dropTable('user_roles', true);
    await queryRunner.dropTable('auth_sessions', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('roles', true);
    await queryRunner.dropTable('users', true);
  }
}
