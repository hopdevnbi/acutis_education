import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPracticeSessionGenerationRequestHash1788063500000 implements MigrationInterface {
  name = 'AddPracticeSessionGenerationRequestHash1788063500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'practice_sessions',
      new TableColumn({
        name: 'generation_request_hash',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('practice_sessions', 'generation_request_hash');
  }
}
