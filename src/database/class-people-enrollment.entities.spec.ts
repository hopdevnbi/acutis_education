import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { ClassCatechistAssignmentEntity } from '../modules/class/entities/class-catechist-assignment.entity';
import { ClassEntity } from '../modules/class/entities/class.entity';
import { EnrollmentEntity } from '../modules/enrollment/entities/enrollment.entity';
import { ParishMembershipEntity } from '../modules/parish/entities/parish-membership.entity';
import { StudentGuardianEntity } from '../modules/student/entities/student-guardian.entity';
import { StudentEntity } from '../modules/student/entities/student.entity';

function resolveTableName(entityTarget: EntityTarget<object>): string | undefined {
  const tableMetadata = getMetadataArgsStorage().tables.find(
    (table) => table.target === entityTarget,
  );

  return tableMetadata?.name;
}

function resolveRelationCount(entityTarget: EntityTarget<object>): number {
  return getMetadataArgsStorage().relations.filter((relation) => relation.target === entityTarget)
    .length;
}

function resolveColumnNames(entityTarget: EntityTarget<object>): string[] {
  return getMetadataArgsStorage()
    .columns.filter((column) => column.target === entityTarget)
    .map((column) => column.options.name ?? column.propertyName);
}

describe('Class people enrollment entities', () => {
  it('maps StudentEntity to students with optional scalar userId', () => {
    expect(resolveTableName(StudentEntity)).toBe('students');
    expect(resolveRelationCount(StudentEntity)).toBe(0);

    expect(resolveColumnNames(StudentEntity)).toEqual(
      expect.arrayContaining(['id', 'userId', 'fullName', 'status', 'createdAt', 'updatedAt']),
    );

    const userIdColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === StudentEntity && column.propertyName === 'userId',
    );

    expect(userIdColumn?.options.nullable).toBe(true);
    expect(userIdColumn?.options.type).toBe('uniqueidentifier');
  });

  it('maps StudentGuardianEntity to student_guardians with scalar IDs only', () => {
    expect(resolveTableName(StudentGuardianEntity)).toBe('student_guardians');
    expect(resolveRelationCount(StudentGuardianEntity)).toBe(0);

    expect(resolveColumnNames(StudentGuardianEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'studentId',
        'guardianUserId',
        'relationshipType',
        'isPrimary',
        'status',
        'startsAt',
        'endsAt',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ClassEntity to classes with scalar parish/year/level IDs', () => {
    expect(resolveTableName(ClassEntity)).toBe('classes');
    expect(resolveRelationCount(ClassEntity)).toBe(0);

    expect(resolveColumnNames(ClassEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'academicYearId',
        'catechismLevelId',
        'code',
        'name',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ClassCatechistAssignmentEntity with scalar classId and catechistUserId', () => {
    expect(resolveTableName(ClassCatechistAssignmentEntity)).toBe('class_catechist_assignments');
    expect(resolveRelationCount(ClassCatechistAssignmentEntity)).toBe(0);

    expect(resolveColumnNames(ClassCatechistAssignmentEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'classId',
        'catechistUserId',
        'assignmentRole',
        'status',
        'assignedAt',
        'endedAt',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps EnrollmentEntity with denormalized parishId and academicYearId', () => {
    expect(resolveTableName(EnrollmentEntity)).toBe('enrollments');
    expect(resolveRelationCount(EnrollmentEntity)).toBe(0);

    expect(resolveColumnNames(EnrollmentEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'studentId',
        'classId',
        'parishId',
        'academicYearId',
        'status',
        'enrolledAt',
        'leftAt',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ParishMembershipEntity to parish_memberships with scalar IDs', () => {
    expect(resolveTableName(ParishMembershipEntity)).toBe('parish_memberships');
    expect(resolveRelationCount(ParishMembershipEntity)).toBe(0);

    expect(resolveColumnNames(ParishMembershipEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'userId',
        'status',
        'joinedAt',
        'endedAt',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('uses application-assigned primary keys instead of generated columns', () => {
    const entityTargets = [
      StudentEntity,
      StudentGuardianEntity,
      ClassEntity,
      ClassCatechistAssignmentEntity,
      EnrollmentEntity,
      ParishMembershipEntity,
    ];

    const generatedColumnCount = getMetadataArgsStorage().generations.filter((generation) =>
      entityTargets.includes(generation.target as typeof StudentEntity),
    ).length;

    expect(generatedColumnCount).toBe(0);
  });
});
