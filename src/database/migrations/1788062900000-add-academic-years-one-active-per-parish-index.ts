import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademicYearsOneActivePerParishIndex1788062900000 implements MigrationInterface {
  name = 'AddAcademicYearsOneActivePerParishIndex1788062900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX [UQ_academic_years_parish_id_active]
      ON [academic_years] ([parish_id])
      WHERE [status] = 'ACTIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX [UQ_academic_years_parish_id_active] ON [academic_years]
    `);
  }
}
