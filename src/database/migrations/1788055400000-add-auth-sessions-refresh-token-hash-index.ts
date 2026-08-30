import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddAuthSessionsRefreshTokenHashIndex1788055400000 implements MigrationInterface {
  name = 'AddAuthSessionsRefreshTokenHashIndex1788055400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'auth_sessions',
      new TableIndex({
        name: 'UQ_auth_sessions_refresh_token_hash',
        columnNames: ['refresh_token_hash'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('auth_sessions', 'UQ_auth_sessions_refresh_token_hash');
  }
}
