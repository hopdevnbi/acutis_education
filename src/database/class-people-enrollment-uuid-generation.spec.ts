import { isUuidV4 } from '../database/uuid-v4.util';
import { ClassCatechistAssignmentEntity } from '../modules/class/entities/class-catechist-assignment.entity';
import { ClassEntity } from '../modules/class/entities/class.entity';
import { CatechistAssignmentRole } from '../modules/class/enums/catechist-assignment-role.enum';
import { CatechistAssignmentStatus } from '../modules/class/enums/catechist-assignment-status.enum';
import { ClassStatus } from '../modules/class/enums/class-status.enum';
import { EnrollmentEntity } from '../modules/enrollment/entities/enrollment.entity';
import { EnrollmentStatus } from '../modules/enrollment/enums/enrollment-status.enum';
import { ParishMembershipEntity } from '../modules/parish/entities/parish-membership.entity';
import { ParishMembershipStatus } from '../modules/parish/enums/parish-membership-status.enum';
import { StudentGuardianEntity } from '../modules/student/entities/student-guardian.entity';
import { StudentEntity } from '../modules/student/entities/student.entity';
import { GuardianLinkStatus } from '../modules/student/enums/guardian-link-status.enum';
import { GuardianRelationshipType } from '../modules/student/enums/guardian-relationship-type.enum';
import { StudentStatus } from '../modules/student/enums/student-status.enum';

describe('Class people enrollment entity UUID generation', () => {
  it.each([
    ['StudentEntity', () => new StudentEntity()],
    ['StudentGuardianEntity', () => new StudentGuardianEntity()],
    ['ClassEntity', () => new ClassEntity()],
    ['ClassCatechistAssignmentEntity', () => new ClassCatechistAssignmentEntity()],
    ['EnrollmentEntity', () => new EnrollmentEntity()],
    ['ParishMembershipEntity', () => new ParishMembershipEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when StudentEntity is constructed with explicit values', () => {
    const explicitId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const student = new StudentEntity();
    student.id = explicitId;
    student.fullName = 'Nguyen Van A';
    student.status = StudentStatus.Active;
    student.userId = null;

    expect(student.id).toBe(explicitId);
  });

  it('allows EnrollmentEntity scalar foreign key assignment without relations', () => {
    const enrollment = new EnrollmentEntity();
    enrollment.studentId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    enrollment.classId = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    enrollment.parishId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    enrollment.academicYearId = 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    enrollment.status = EnrollmentStatus.Active;
    enrollment.enrolledAt = new Date('2026-09-01T00:00:00.000Z');
    enrollment.leftAt = null;

    expect(enrollment.parishId).toBe('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44');
    expect(enrollment.leftAt).toBeNull();
  });

  it('allows ClassCatechistAssignmentEntity scalar assignment fields', () => {
    const assignment = new ClassCatechistAssignmentEntity();
    assignment.classId = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
    assignment.catechistUserId = 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
    assignment.assignmentRole = CatechistAssignmentRole.Lead;
    assignment.status = CatechistAssignmentStatus.Active;
    assignment.assignedAt = new Date('2026-09-01T00:00:00.000Z');
    assignment.endedAt = null;

    expect(assignment.assignmentRole).toBe(CatechistAssignmentRole.Lead);
    expect(assignment.endedAt).toBeNull();
  });

  it('allows ClassEntity with all scalar scope keys', () => {
    const classEntity = new ClassEntity();
    classEntity.parishId = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';
    classEntity.academicYearId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
    classEntity.catechismLevelId = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa';
    classEntity.code = 'class-a';
    classEntity.name = 'Lop Khai Tam A';
    classEntity.status = ClassStatus.Planned;

    expect(classEntity.code).toBe('class-a');
  });

  it('allows StudentGuardianEntity relationship metadata fields', () => {
    const guardian = new StudentGuardianEntity();
    guardian.studentId = 'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380bbb';
    guardian.guardianUserId = 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380ccc';
    guardian.relationshipType = GuardianRelationshipType.Parent;
    guardian.isPrimary = true;
    guardian.status = GuardianLinkStatus.Active;
    guardian.startsAt = new Date('2026-09-01T00:00:00.000Z');
    guardian.endsAt = null;

    expect(guardian.isPrimary).toBe(true);
  });

  it('allows ParishMembershipEntity scalar parish and user IDs', () => {
    const membership = new ParishMembershipEntity();
    membership.parishId = 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380ddd';
    membership.userId = 'b3eebc99-9c0b-4ef8-bb6d-6bb9bd380eee';
    membership.status = ParishMembershipStatus.Active;
    membership.joinedAt = new Date('2026-09-01T00:00:00.000Z');
    membership.endedAt = null;

    expect(membership.status).toBe(ParishMembershipStatus.Active);
  });
});
