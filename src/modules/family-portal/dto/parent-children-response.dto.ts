import { ApiProperty } from '@nestjs/swagger';
import { StudentStatus } from '../../student/enums/student-status.enum';
import type {
  ParentPortalChildEnrollmentSnapshot,
  ParentPortalChildSnapshot,
  ParentPortalChildrenSnapshot,
} from '../interfaces/parent-portal.interface';

export class ParentChildEnrollmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  enrollmentId!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty()
  className!: string;

  @ApiProperty({ format: 'uuid' })
  parishId!: string;

  @ApiProperty({ format: 'uuid' })
  academicYearId!: string;

  @ApiProperty({ format: 'uuid' })
  catechismLevelId!: string;
}

export class ParentChildResponseDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: StudentStatus })
  studentStatus!: StudentStatus;

  @ApiProperty({ type: [ParentChildEnrollmentResponseDto] })
  activeEnrollments!: ParentChildEnrollmentResponseDto[];
}

export class ParentChildrenResponseDto {
  @ApiProperty({ type: [ParentChildResponseDto] })
  items!: ParentChildResponseDto[];
}

function toParentChildEnrollmentResponseDto(
  snapshot: ParentPortalChildEnrollmentSnapshot,
): ParentChildEnrollmentResponseDto {
  return {
    enrollmentId: snapshot.enrollmentId,
    classId: snapshot.classId,
    className: snapshot.className,
    parishId: snapshot.parishId,
    academicYearId: snapshot.academicYearId,
    catechismLevelId: snapshot.catechismLevelId,
  };
}

function toParentChildResponseDto(snapshot: ParentPortalChildSnapshot): ParentChildResponseDto {
  return {
    studentId: snapshot.studentId,
    displayName: snapshot.displayName,
    studentStatus: snapshot.studentStatus,
    activeEnrollments: snapshot.activeEnrollments.map(toParentChildEnrollmentResponseDto),
  };
}

export function toParentChildrenResponseDto(
  snapshot: ParentPortalChildrenSnapshot,
): ParentChildrenResponseDto {
  return {
    items: snapshot.items.map(toParentChildResponseDto),
  };
}
