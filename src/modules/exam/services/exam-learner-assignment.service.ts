import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { ClassService } from '../../class/services/class.service';
import { ClassStatus } from '../../class/enums/class-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { StudentService } from '../../student/services/student.service';
import { StudentStatus } from '../../student/enums/student-status.enum';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamEntity } from '../entities/exam.entity';
import { ExamVersionEntity } from '../entities/exam-version.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { ExamAssignmentStatus } from '../enums/exam-assignment-status.enum';
import { ExamEnrollmentNotEligibleError } from '../errors/exam.errors';
import type {
  LearnerExamAssignmentSnapshot,
  ListLearnerExamAssignmentsResult,
} from '../interfaces/exam-attempt.interface';
import { resolveExamAssignmentEffectiveStatus } from '../utils/exam-assignment-status.util';
import { ExamAttemptAccessService } from './exam-attempt-access.service';

@Injectable()
export class ExamLearnerAssignmentService {
  constructor(
    @InjectRepository(ExamAssignmentEntity)
    private readonly examAssignmentRepository: Repository<ExamAssignmentEntity>,
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    @InjectRepository(ExamEntity)
    private readonly examRepository: Repository<ExamEntity>,
    @InjectRepository(ExamVersionEntity)
    private readonly examVersionRepository: Repository<ExamVersionEntity>,
    private readonly enrollmentService: EnrollmentService,
    private readonly studentService: StudentService,
    private readonly classService: ClassService,
    private readonly examAttemptAccessService: ExamAttemptAccessService,
  ) {}

  async listAvailableAssignmentsForEnrollment(
    rawEnrollmentId: string,
    rawActorUserId: string,
  ): Promise<ListLearnerExamAssignmentsResult> {
    const enrollment = await this.enrollmentService.getEnrollmentById(rawEnrollmentId);
    await this.examAttemptAccessService.assertCanAttemptAsLinkedStudent(
      rawActorUserId,
      enrollment.studentId,
    );
    await this.assertEnrollmentEligible(
      enrollment.status,
      enrollment.studentId,
      enrollment.classId,
    );

    const now = new Date();
    const classAssignments = await this.examAssignmentRepository.find({
      where: { classId: enrollment.classId },
      order: { opensAt: 'ASC' },
    });

    const openAssignments = classAssignments.filter(
      (assignment) =>
        assignment.status !== ExamAssignmentStatus.Cancelled &&
        resolveExamAssignmentEffectiveStatus(
          assignment.status,
          assignment.opensAt,
          assignment.closesAt,
          now,
        ) === ExamAssignmentStatus.Open,
    );

    if (openAssignments.length === 0) {
      return { items: [] };
    }

    const versionIds = [...new Set(openAssignments.map((assignment) => assignment.examVersionId))];
    const versions = await this.examVersionRepository.find({
      where: { id: In(versionIds) },
    });
    const versionById = new Map(versions.map((version) => [version.id, version]));

    const examIds = [...new Set(versions.map((version) => version.examId))];
    const exams = await this.examRepository.find({
      where: { id: In(examIds), status: ExamStatus.Active },
    });
    const examById = new Map(exams.map((exam) => [exam.id, exam]));

    const attempts = await this.examAttemptRepository.find({
      where: {
        enrollmentId: enrollment.id,
        examAssignmentId: In(openAssignments.map((assignment) => assignment.id)),
      },
    });
    const attemptsByAssignmentId = new Map<string, ExamAttemptEntity[]>();

    for (const attempt of attempts) {
      const assignmentId = normalizeUuid(attempt.examAssignmentId);
      const existing = attemptsByAssignmentId.get(assignmentId) ?? [];
      existing.push(attempt);
      attemptsByAssignmentId.set(assignmentId, existing);
    }

    const items: LearnerExamAssignmentSnapshot[] = [];

    for (const assignment of openAssignments) {
      const version = versionById.get(assignment.examVersionId);

      if (version === undefined) {
        continue;
      }

      const exam = examById.get(version.examId);

      if (exam === undefined) {
        continue;
      }

      const assignmentAttempts = attemptsByAssignmentId.get(assignment.id) ?? [];
      const startedAttempts = assignmentAttempts.filter(
        (attempt) =>
          attempt.status === ExamAttemptStatus.InProgress ||
          attempt.status === ExamAttemptStatus.Submitted ||
          attempt.status === ExamAttemptStatus.Graded,
      );
      const inProgressAttempt = assignmentAttempts.find(
        (attempt) => attempt.status === ExamAttemptStatus.InProgress,
      );
      const attemptsRemaining = Math.max(0, version.maxAttempts - startedAttempts.length);

      items.push({
        id: assignment.id,
        examVersionId: assignment.examVersionId,
        examId: exam.id,
        classId: assignment.classId,
        opensAt: assignment.opensAt,
        closesAt: assignment.closesAt,
        status: assignment.status,
        effectiveStatus: resolveExamAssignmentEffectiveStatus(
          assignment.status,
          assignment.opensAt,
          assignment.closesAt,
          now,
        ),
        examCode: exam.code,
        examTitle: version.title,
        durationMinutes: version.durationMinutes,
        maxAttempts: version.maxAttempts,
        attemptsStarted: startedAttempts.length,
        attemptsRemaining,
        hasInProgressAttempt: inProgressAttempt !== undefined,
        inProgressAttemptId: inProgressAttempt?.id ?? null,
      });
    }

    return { items };
  }

  private async assertEnrollmentEligible(
    enrollmentStatus: EnrollmentStatus,
    studentId: string,
    classId: string,
  ): Promise<void> {
    if (enrollmentStatus !== EnrollmentStatus.Active) {
      throw new ExamEnrollmentNotEligibleError();
    }

    const student = await this.studentService.getStudentById(studentId);

    if (student.status !== StudentStatus.Active) {
      throw new ExamEnrollmentNotEligibleError();
    }

    const classSnapshot = await this.classService.getClassById(classId);

    if (classSnapshot.status !== ClassStatus.Active) {
      throw new ExamEnrollmentNotEligibleError();
    }
  }
}
