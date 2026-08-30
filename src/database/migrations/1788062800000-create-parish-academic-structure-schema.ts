import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateParishAcademicStructureSchema1788062800000 implements MigrationInterface {
  name = 'CreateParishAcademicStructureSchema1788062800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'parishes',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
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
      'parishes',
      new TableIndex({
        name: 'UQ_parishes_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'parishes',
      new TableIndex({
        name: 'IX_parishes_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'academic_years',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'parish_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'date',
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
      'academic_years',
      new TableIndex({
        name: 'IX_academic_years_parish_id',
        columnNames: ['parish_id'],
      }),
    );

    await queryRunner.createIndex(
      'academic_years',
      new TableIndex({
        name: 'IX_academic_years_parish_id_status',
        columnNames: ['parish_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'academic_years',
      new TableIndex({
        name: 'UQ_academic_years_parish_id_name',
        columnNames: ['parish_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'academic_years',
      new TableForeignKey({
        name: 'FK_academic_years_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.query(`
      ALTER TABLE [academic_years]
      ADD CONSTRAINT [CK_academic_years_start_date_before_end_date]
      CHECK ([start_date] < [end_date])
    `);

    await queryRunner.createTable(
      new Table({
        name: 'catechism_levels',
        columns: [
          {
            name: 'id',
            type: 'uniqueidentifier',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'parish_id',
            type: 'uniqueidentifier',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'int',
            default: 0,
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
      'catechism_levels',
      new TableIndex({
        name: 'IX_catechism_levels_parish_id',
        columnNames: ['parish_id'],
      }),
    );

    await queryRunner.createIndex(
      'catechism_levels',
      new TableIndex({
        name: 'IX_catechism_levels_parish_id_sort_order',
        columnNames: ['parish_id', 'sort_order'],
      }),
    );

    await queryRunner.createIndex(
      'catechism_levels',
      new TableIndex({
        name: 'UQ_catechism_levels_parish_id_code',
        columnNames: ['parish_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'catechism_levels',
      new TableForeignKey({
        name: 'FK_catechism_levels_parish_id_parishes_id',
        columnNames: ['parish_id'],
        referencedTableName: 'parishes',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('catechism_levels', true);
    await queryRunner.dropTable('academic_years', true);
    await queryRunner.dropTable('parishes', true);
  }
}
