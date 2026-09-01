import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPracticeSessionQuestionTranslationSnapshot1788063900000 implements MigrationInterface {
  name = 'AddPracticeSessionQuestionTranslationSnapshot1788063900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'practice_session_questions',
      new TableColumn({
        name: 'translation_revision_id',
        type: 'uniqueidentifier',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'practice_session_questions',
      new TableColumn({
        name: 'delivered_locale',
        type: 'varchar',
        length: '32',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('practice_session_questions', 'delivered_locale');
    await queryRunner.dropColumn('practice_session_questions', 'translation_revision_id');
  }
}
