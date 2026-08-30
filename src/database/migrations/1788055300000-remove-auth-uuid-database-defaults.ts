import { MigrationInterface, QueryRunner } from 'typeorm';

const AUTH_UUID_PRIMARY_KEY_TABLES = ['users', 'roles', 'permissions', 'auth_sessions'] as const;

async function dropColumnDefaultConstraint(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
): Promise<void> {
  await queryRunner.query(`
    DECLARE @constraintName NVARCHAR(200);

    SELECT @constraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
      ON c.default_object_id = dc.object_id
    INNER JOIN sys.tables t
      ON t.object_id = c.object_id
    WHERE t.name = '${tableName}'
      AND c.name = '${columnName}';

    IF @constraintName IS NOT NULL
      EXEC('ALTER TABLE [${tableName}] DROP CONSTRAINT [' + @constraintName + ']');
  `);
}

async function addNewSequentialIdDefault(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE [${tableName}]
    ADD CONSTRAINT [DF_${tableName}_${columnName}]
    DEFAULT (NEWSEQUENTIALID()) FOR [${columnName}];
  `);
}

export class RemoveAuthUuidDatabaseDefaults1788055300000 implements MigrationInterface {
  name = 'RemoveAuthUuidDatabaseDefaults1788055300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of AUTH_UUID_PRIMARY_KEY_TABLES) {
      await dropColumnDefaultConstraint(queryRunner, tableName, 'id');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of AUTH_UUID_PRIMARY_KEY_TABLES) {
      await addNewSequentialIdDefault(queryRunner, tableName, 'id');
    }
  }
}
