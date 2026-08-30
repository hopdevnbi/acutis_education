import { isUuidV4 } from '../database/uuid-v4.util';
import { AcademicYearEntity } from '../modules/academic-structure/entities/academic-year.entity';
import { CatechismLevelEntity } from '../modules/academic-structure/entities/catechism-level.entity';
import { AcademicYearStatus } from '../modules/academic-structure/enums/academic-year-status.enum';
import { CatechismLevelStatus } from '../modules/academic-structure/enums/catechism-level-status.enum';
import { ParishEntity } from '../modules/parish/entities/parish.entity';
import { ParishStatus } from '../modules/parish/enums/parish-status.enum';

describe('Parish academic structure entity UUID generation', () => {
  it.each([
    ['ParishEntity', () => new ParishEntity()],
    ['AcademicYearEntity', () => new AcademicYearEntity()],
    ['CatechismLevelEntity', () => new CatechismLevelEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when ParishEntity is constructed with explicit values', () => {
    const explicitId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const parish = new ParishEntity();
    parish.id = explicitId;
    parish.code = 'sample-parish';
    parish.name = 'Sample Parish';
    parish.status = ParishStatus.Active;

    expect(parish.id).toBe(explicitId);
  });

  it('allows AcademicYearEntity scalar parishId without relation metadata', () => {
    const academicYear = new AcademicYearEntity();
    academicYear.parishId = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    academicYear.name = '2026-2027';
    academicYear.startDate = '2026-09-01';
    academicYear.endDate = '2027-06-30';
    academicYear.status = AcademicYearStatus.Planned;

    expect(academicYear.parishId).toBe('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
  });

  it('allows CatechismLevelEntity scalar parishId assignment', () => {
    const level = new CatechismLevelEntity();
    level.parishId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    level.code = 'khai-tam';
    level.name = 'Khai Tam';
    level.sortOrder = 1;
    level.status = CatechismLevelStatus.Active;

    expect(level.parishId).toBe('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44');
    expect(level.sortOrder).toBe(1);
  });
});
