import { Test, type TestingModule } from '@nestjs/testing';
import { ClassScopeAccessDeniedError } from '../../class/errors/class-scope.errors';
import { ClassScopeService } from '../../class/services/class-scope.service';
import { ClassService } from '../../class/services/class.service';
import { CurriculumVersionStatus } from '../../curriculum/enums/curriculum-version-status.enum';
import { CurriculumStatus } from '../../curriculum/enums/curriculum-status.enum';
import { CurriculumAssignmentNotFoundError } from '../../curriculum/errors/curriculum.errors';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { EnrollmentAccessService } from '../../enrollment/services/enrollment-access.service';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  type ContentDocumentV1,
} from '../../learning-content/interfaces/learning-content.interface';
import { LearningContentService } from '../../learning-content/services/learning-content.service';
import { StudentAccessDeniedError } from '../../student/errors/student-access.errors';
import {
  DraftCurriculumDeliveryDeniedError,
  LessonNotInAssignedCurriculumError,
} from '../errors/curriculum-delivery.errors';
import { CurriculumDeliveryService } from './curriculum-delivery.service';

describe('CurriculumDeliveryService', () => {
  let curriculumDeliveryService: CurriculumDeliveryService;
  let classScopeService: jest.Mocked<Pick<ClassScopeService, 'assertCanReadClass'>>;
  let classService: jest.Mocked<Pick<ClassService, 'getClassById'>>;
  let enrollmentService: jest.Mocked<Pick<EnrollmentService, 'getEnrollmentById'>>;
  let enrollmentAccessService: jest.Mocked<
    Pick<EnrollmentAccessService, 'assertCanReadEnrollment'>
  >;
  let curriculumService: jest.Mocked<
    Pick<
      CurriculumService,
      | 'getPublishedVersionForAssignment'
      | 'getCurriculumById'
      | 'getVersionTree'
      | 'getLessonCurriculumContext'
      | 'assertVersionPublished'
    >
  >;
  let learningContentService: jest.Mocked<Pick<LearningContentService, 'getLessonContent'>>;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const academicYearId = '22222222-2222-4222-8222-222222222222';
  const catechismLevelId = '33333333-3333-4333-8333-333333333333';
  const classId = '44444444-4444-4444-8444-444444444444';
  const adminUserId = '55555555-5555-4555-8555-555555555555';
  const catechistUserId = '66666666-6666-4666-8666-666666666666';
  const parentUserId = '77777777-7777-4777-8777-777777777777';
  const enrollmentId = '88888888-8888-4888-8888-888888888888';
  const studentId = '99999999-9999-4999-8999-999999999999';
  const curriculumId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const assignedVersionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const otherVersionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const lessonId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const draftLessonId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const canonicalLessonKey = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  const classSnapshot = {
    id: classId,
    parishId,
    academicYearId,
    catechismLevelId,
    code: 'class-a',
    name: 'Class A',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const curriculumSnapshot = {
    id: curriculumId,
    parishId,
    catechismLevelId,
    code: 'khai-tam',
    name: 'Khai Tam',
    description: null,
    status: CurriculumStatus.Active,
    sourceLocale: 'vi-VN',
    currentPublishedVersionId: assignedVersionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const assignedVersionSnapshot = {
    id: assignedVersionId,
    curriculumId,
    versionNumber: 1,
    status: CurriculumVersionStatus.Published,
    label: 'Published v1',
    publishedAt: new Date(),
    publishedByUserId: adminUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const versionTreeSnapshot = {
    version: assignedVersionSnapshot,
    topics: [
      {
        id: '10101010-1010-4101-8101-101010101010',
        title: 'Topic A',
        description: null,
        sortOrder: 0,
        lessons: [
          {
            id: lessonId,
            topicId: '10101010-1010-4101-8101-101010101010',
            curriculumVersionId: assignedVersionId,
            canonicalLessonKey,
            title: 'Lesson A',
            summary: null,
            sortOrder: 0,
            estimatedDurationMinutes: 45,
          },
        ],
      },
    ],
  };

  const sampleDocument: ContentDocumentV1 = {
    schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
    blocks: [{ type: 'paragraph', text: 'Sample learner content.' }],
  };

  const learningContentSnapshot = {
    id: '12121212-1212-4121-8121-121212121212',
    lessonId,
    contentSchemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
    document: sampleDocument,
    contentHash: 'abc123hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    classScopeService = {
      assertCanReadClass: jest.fn().mockResolvedValue(undefined),
    };

    classService = {
      getClassById: jest.fn().mockResolvedValue(classSnapshot),
    };

    enrollmentService = {
      getEnrollmentById: jest.fn().mockResolvedValue({
        id: enrollmentId,
        classId,
        studentId,
        parishId,
        academicYearId,
        status: 'ACTIVE',
        enrolledAt: new Date(),
        leftAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    enrollmentAccessService = {
      assertCanReadEnrollment: jest.fn().mockResolvedValue(undefined),
    };

    curriculumService = {
      getPublishedVersionForAssignment: jest.fn().mockResolvedValue(assignedVersionSnapshot),
      getCurriculumById: jest.fn().mockResolvedValue(curriculumSnapshot),
      getVersionTree: jest.fn().mockResolvedValue(versionTreeSnapshot),
      getLessonCurriculumContext: jest.fn().mockResolvedValue({
        lessonId,
        topicId: '10101010-1010-4101-8101-101010101010',
        curriculumVersionId: assignedVersionId,
        curriculumId,
        parishId,
        canonicalLessonKey,
        versionStatus: CurriculumVersionStatus.Published,
        curriculumStatus: CurriculumStatus.Active,
      }),
      assertVersionPublished: jest.fn().mockResolvedValue(assignedVersionSnapshot),
    };

    learningContentService = {
      getLessonContent: jest.fn().mockResolvedValue(learningContentSnapshot),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumDeliveryService,
        { provide: ClassService, useValue: classService },
        { provide: ClassScopeService, useValue: classScopeService },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: EnrollmentAccessService, useValue: enrollmentAccessService },
        { provide: CurriculumService, useValue: curriculumService },
        { provide: LearningContentService, useValue: learningContentService },
      ],
    }).compile();

    curriculumDeliveryService = moduleRef.get(CurriculumDeliveryService);
  });

  describe('getClassCurriculumTree', () => {
    it('returns the assigned published tree for an assigned catechist', async () => {
      const tree = await curriculumDeliveryService.getClassCurriculumTree(catechistUserId, classId);

      expect(classScopeService.assertCanReadClass).toHaveBeenCalledWith(catechistUserId, classId);
      expect(curriculumService.getPublishedVersionForAssignment).toHaveBeenCalledWith(
        parishId,
        academicYearId,
        catechismLevelId,
      );
      expect(tree.version.id).toBe(assignedVersionId);
      expect(tree.topics[0]?.lessons[0]?.canonicalLessonKey).toBe(canonicalLessonKey);
    });

    it('returns the assigned published tree for a parish admin', async () => {
      const tree = await curriculumDeliveryService.getClassCurriculumTree(adminUserId, classId);

      expect(classScopeService.assertCanReadClass).toHaveBeenCalledWith(adminUserId, classId);
      expect(tree.curriculum.name).toBe('Khai Tam');
    });

    it('denies an unassigned catechist', async () => {
      classScopeService.assertCanReadClass.mockRejectedValue(new ClassScopeAccessDeniedError());

      await expect(
        curriculumDeliveryService.getClassCurriculumTree(catechistUserId, classId),
      ).rejects.toBeInstanceOf(ClassScopeAccessDeniedError);
    });

    it('propagates missing assignment errors', async () => {
      curriculumService.getPublishedVersionForAssignment.mockRejectedValue(
        new CurriculumAssignmentNotFoundError(),
      );

      await expect(
        curriculumDeliveryService.getClassCurriculumTree(adminUserId, classId),
      ).rejects.toBeInstanceOf(CurriculumAssignmentNotFoundError);
    });
  });

  describe('getEnrollmentCurriculumTree', () => {
    it('returns the assigned published tree for a linked parent', async () => {
      const tree = await curriculumDeliveryService.getEnrollmentCurriculumTree(
        parentUserId,
        enrollmentId,
      );

      expect(enrollmentAccessService.assertCanReadEnrollment).toHaveBeenCalledWith(
        parentUserId,
        classId,
        studentId,
      );
      expect(tree.topics).toHaveLength(1);
    });

    it('denies an unrelated parent', async () => {
      enrollmentAccessService.assertCanReadEnrollment.mockRejectedValue(
        new StudentAccessDeniedError(),
      );

      await expect(
        curriculumDeliveryService.getEnrollmentCurriculumTree(parentUserId, enrollmentId),
      ).rejects.toBeInstanceOf(StudentAccessDeniedError);
    });
  });

  describe('getClassLessonContent', () => {
    it('returns learner content metadata for an assigned class context', async () => {
      const content = await curriculumDeliveryService.getClassLessonContent(
        catechistUserId,
        classId,
        lessonId,
        'vi-VN',
      );

      expect(content.lessonId).toBe(lessonId);
      expect(content.canonicalLessonKey).toBe(canonicalLessonKey);
      expect(content.curriculumVersionId).toBe(assignedVersionId);
      expect(content.contentHash).toBe('abc123hash');
      expect(content.sourceLocale).toBe('vi-VN');
      expect(content.resolvedLocale).toBe('vi-VN');
      expect(content.translationStatus).toBe('SOURCE');
      expect(content.requestedLocale).toBe('vi-VN');
      expect(content.document).toEqual(sampleDocument);
    });

    it('denies draft lesson content in class context', async () => {
      curriculumService.getLessonCurriculumContext.mockResolvedValue({
        lessonId: draftLessonId,
        topicId: '10101010-1010-4101-8101-101010101010',
        curriculumVersionId: otherVersionId,
        curriculumId,
        parishId,
        canonicalLessonKey,
        versionStatus: CurriculumVersionStatus.Draft,
        curriculumStatus: CurriculumStatus.Active,
      });

      await expect(
        curriculumDeliveryService.getClassLessonContent(
          catechistUserId,
          classId,
          draftLessonId,
          null,
        ),
      ).rejects.toBeInstanceOf(DraftCurriculumDeliveryDeniedError);
    });

    it('denies lessons from a non-assigned published version', async () => {
      curriculumService.getLessonCurriculumContext.mockResolvedValue({
        lessonId,
        topicId: '10101010-1010-4101-8101-101010101010',
        curriculumVersionId: otherVersionId,
        curriculumId,
        parishId,
        canonicalLessonKey,
        versionStatus: CurriculumVersionStatus.Published,
        curriculumStatus: CurriculumStatus.Active,
      });

      await expect(
        curriculumDeliveryService.getClassLessonContent(catechistUserId, classId, lessonId, null),
      ).rejects.toBeInstanceOf(LessonNotInAssignedCurriculumError);
    });

    it('denies unassigned catechists before curriculum checks', async () => {
      classScopeService.assertCanReadClass.mockRejectedValue(new ClassScopeAccessDeniedError());

      await expect(
        curriculumDeliveryService.getClassLessonContent(catechistUserId, classId, lessonId, null),
      ).rejects.toBeInstanceOf(ClassScopeAccessDeniedError);

      expect(curriculumService.getLessonCurriculumContext).not.toHaveBeenCalled();
    });
  });

  describe('getEnrollmentLessonContent', () => {
    it('returns learner content for a linked parent enrollment context', async () => {
      const content = await curriculumDeliveryService.getEnrollmentLessonContent(
        parentUserId,
        enrollmentId,
        lessonId,
        null,
      );

      expect(enrollmentAccessService.assertCanReadEnrollment).toHaveBeenCalledWith(
        parentUserId,
        classId,
        studentId,
      );
      expect(content.contentHash).toBe('abc123hash');
    });

    it('denies unrelated parents for enrollment lesson content', async () => {
      enrollmentAccessService.assertCanReadEnrollment.mockRejectedValue(
        new StudentAccessDeniedError(),
      );

      await expect(
        curriculumDeliveryService.getEnrollmentLessonContent(
          parentUserId,
          enrollmentId,
          lessonId,
          null,
        ),
      ).rejects.toBeInstanceOf(StudentAccessDeniedError);
    });
  });
});
