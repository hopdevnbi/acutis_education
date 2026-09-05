import { CommunityDemoSeedService } from './community-demo.seed.service';
import {
  COMMUNITY_DEMO_ANNOUNCEMENT_CODES,
  COMMUNITY_DEMO_CMS_SLUGS,
  COMMUNITY_DEMO_EVENT_CODES,
  COMMUNITY_DEMO_FAKE_DEVICE_TOKEN,
  COMMUNITY_DEMO_NOTIFICATION_IDS,
} from './community-demo.seed.constants';

describe('CommunityDemoSeedService unit & idempotency spec', () => {
  let authRbacSeedService: { run: jest.Mock };
  let parishAcademicSeedService: { run: jest.Mock };
  let classEnrollmentSeedService: {
    run: jest.Mock;
    parentEmail?: string;
    studentAlphaEmail?: string;
  };
  let parishService: { listParishes: jest.Mock };
  let classService: { listClasses: jest.Mock };
  let studentService: { listStudents: jest.Mock };
  let enrollmentService: { listEnrollments: jest.Mock };
  let userAccountService: { getAccountSnapshotByEmail: jest.Mock };
  let cmsService: {
    findAdminList: jest.Mock;
    createEntry: jest.Mock;
    publishEntry: jest.Mock;
    archiveEntry: jest.Mock;
  };
  let announcementsService: {
    findAdminList: jest.Mock;
    createAnnouncement: jest.Mock;
    publishAnnouncement: jest.Mock;
    archiveAnnouncement: jest.Mock;
    markRead: jest.Mock;
    dismissAnnouncement: jest.Mock;
  };
  let eventsService: {
    findEventByCode: jest.Mock;
    createEvent: jest.Mock;
    publishEvent: jest.Mock;
    cancelEvent: jest.Mock;
    completeEvent: jest.Mock;
    archiveEvent: jest.Mock;
    register: jest.Mock;
    checkIn: jest.Mock;
  };
  let notificationsService: {
    createOrGetHeader: jest.Mock;
    fanOutRecipients: jest.Mock;
    markRead: jest.Mock;
    registerDevice: jest.Mock;
  };

  let service: CommunityDemoSeedService;

  beforeEach(() => {
    authRbacSeedService = { run: jest.fn().mockResolvedValue(undefined) };
    parishAcademicSeedService = { run: jest.fn().mockResolvedValue(undefined) };
    classEnrollmentSeedService = {
      run: jest.fn().mockResolvedValue(undefined),
      parentEmail: 'parent@local.catechism.test',
      studentAlphaEmail: 'student-alpha@local.catechism.test',
    };
    parishService = {
      listParishes: jest.fn().mockResolvedValue([
        { id: 'p0000000-0000-0000-0000-000000000001', code: 'GX-TAN-DINH', name: 'Tân Định' },
      ]),
    };
    classService = {
      listClasses: jest.fn().mockResolvedValue([
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          code: 'GL-2026-BAN-1',
          parishId: 'p0000000-0000-0000-0000-000000000001',
        },
      ]),
    };
    studentService = {
      listStudents: jest.fn().mockResolvedValue([
        { id: 's0000000-0000-0000-0000-000000000001', fullName: 'Nguyen Van Alpha' },
      ]),
    };
    enrollmentService = {
      listEnrollments: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'e0000000-0000-0000-0000-000000000001',
            studentId: 's0000000-0000-0000-0000-000000000001',
            classId: 'c0000000-0000-0000-0000-000000000001',
            status: 'ACTIVE',
          },
        ],
        total: 1,
      }),
    };
    userAccountService = {
      getAccountSnapshotByEmail: jest.fn().mockImplementation((email: string) => {
        return Promise.resolve({ id: `u-${email}`, email });
      }),
    };

    cmsService = {
      findAdminList: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      createEntry: jest.fn().mockImplementation((input) =>
        Promise.resolve({ id: `cms-${input.slug}`, ...input }),
      ),
      publishEntry: jest.fn().mockImplementation((id) => Promise.resolve({ id })),
      archiveEntry: jest.fn().mockImplementation((id) => Promise.resolve({ id })),
    };

    announcementsService = {
      findAdminList: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      createAnnouncement: jest.fn().mockImplementation((input) =>
        Promise.resolve({ announcement: { id: `ann-${input.title}`, ...input }, targets: [] }),
      ),
      publishAnnouncement: jest.fn().mockImplementation((id) => Promise.resolve({ announcement: { id } })),
      archiveAnnouncement: jest.fn().mockImplementation((id) => Promise.resolve({ announcement: { id } })),
      markRead: jest.fn().mockResolvedValue({ isRead: true }),
      dismissAnnouncement: jest.fn().mockResolvedValue({ isDismissed: true }),
    };

    eventsService = {
      findEventByCode: jest.fn().mockResolvedValue(null),
      createEvent: jest.fn().mockImplementation((input) =>
        Promise.resolve({ event: { id: `evt-${input.code}`, ...input }, targets: [] }),
      ),
      publishEvent: jest.fn().mockImplementation((id) => Promise.resolve({ event: { id } })),
      cancelEvent: jest.fn().mockImplementation((id) => Promise.resolve({ event: { id } })),
      completeEvent: jest.fn().mockImplementation((id) => Promise.resolve({ event: { id } })),
      archiveEvent: jest.fn().mockImplementation((id) => Promise.resolve({ event: { id } })),
      register: jest.fn().mockResolvedValue({ id: 'reg-001' }),
      checkIn: jest.fn().mockResolvedValue({ id: 'reg-001' }),
    };

    notificationsService = {
      createOrGetHeader: jest.fn().mockImplementation((input) =>
        Promise.resolve({
          notification: { id: `notif-${input.operationKey}`, ...input },
          isNew: true,
        }),
      ),
      fanOutRecipients: jest.fn().mockResolvedValue(3),
      markRead: jest.fn().mockResolvedValue({ isRead: true }),
      registerDevice: jest.fn().mockResolvedValue({ id: 'dev-001' }),
    };

    service = new CommunityDemoSeedService(
      authRbacSeedService as any,
      parishAcademicSeedService as any,
      classEnrollmentSeedService as any,
      parishService as any,
      classService as any,
      studentService as any,
      enrollmentService as any,
      userAccountService as any,
      cmsService as any,
      announcementsService as any,
      eventsService as any,
      notificationsService as any,
    );
  });

  it('runs successfully from clean state and creates all required demo entities', async () => {
    const summary = await service.run();

    expect(authRbacSeedService.run).toHaveBeenCalled();
    expect(parishAcademicSeedService.run).toHaveBeenCalled();
    expect(classEnrollmentSeedService.run).toHaveBeenCalled();

    expect(summary.cmsEntriesSeeded).toBe(6);
    expect(summary.announcementsSeeded).toBe(6);
    expect(summary.eventsSeeded).toBe(8);
    expect(summary.notificationsSeeded).toBe(4);
    expect(summary.devicesRegistered).toBe(1);

    expect(cmsService.createEntry).toHaveBeenCalledTimes(6);
    expect(announcementsService.createAnnouncement).toHaveBeenCalledTimes(6);
    expect(eventsService.createEvent).toHaveBeenCalledTimes(8);
    expect(notificationsService.createOrGetHeader).toHaveBeenCalledTimes(4);
  });

  it('is completely idempotent on sequential rerun', async () => {
    // Simulate all CMS entries existing
    cmsService.findAdminList.mockResolvedValue({
      items: [
        { scopeKey: 'GLOBAL', slug: COMMUNITY_DEMO_CMS_SLUGS.globalPublishedArticle },
        { scopeKey: 'GLOBAL', slug: COMMUNITY_DEMO_CMS_SLUGS.globalDraftPage },
        {
          scopeKey: 'PARISH:p0000000-0000-0000-0000-000000000001',
          slug: COMMUNITY_DEMO_CMS_SLUGS.parishPublishedNews,
        },
        {
          scopeKey: 'PARISH:p0000000-0000-0000-0000-000000000001',
          slug: COMMUNITY_DEMO_CMS_SLUGS.parishScheduledArticle,
        },
        { scopeKey: 'GLOBAL', slug: COMMUNITY_DEMO_CMS_SLUGS.globalArchivedArticle },
        { scopeKey: 'GLOBAL', slug: COMMUNITY_DEMO_CMS_SLUGS.globalFeaturedArticle },
      ],
      total: 6,
    });

    // Simulate all Announcements existing
    announcementsService.findAdminList.mockResolvedValue({
      items: [
        { announcement: { id: 'a1', title: '[Toàn thể] Khai mạc Tuần lễ Thiếu nhi 2026' } },
        { announcement: { id: 'a2', title: '[Tân Định] Lịch Họp Phụ Huynh Đầu Năm' } },
        { announcement: { id: 'a3', title: '[Lớp GL-BAN-1] Chuẩn bị Tài liệu Học tập Bài 1' } },
        { announcement: { id: 'a4', title: '[Giáo Lý Viên] Tập huấn Phương pháp Sư phạm Giáo lý Mới' } },
        { announcement: { id: 'a5', title: '[Dự thảo] Kế hoạch Dã ngoại Mùa Chay' } },
        { announcement: { id: 'a6', title: '[Lưu trữ] Thông báo Nghỉ Tết Nguyên Đán 2026' } },
      ],
      total: 6,
    });

    // Simulate all Events existing
    eventsService.findEventByCode.mockImplementation((code: string) => {
      return Promise.resolve({ id: `existing-${code}`, code });
    });

    // Simulate all Notifications existing
    notificationsService.createOrGetHeader.mockResolvedValue({
      notification: { id: 'existing-notif' },
      isNew: false,
    });
    notificationsService.fanOutRecipients.mockResolvedValue(0);

    const summary = await service.run();

    expect(summary.cmsEntriesSeeded).toBe(0);
    expect(summary.announcementsSeeded).toBe(0);
    expect(summary.eventsSeeded).toBe(0);
    expect(summary.notificationsSeeded).toBe(0);

    expect(cmsService.createEntry).not.toHaveBeenCalled();
    expect(announcementsService.createAnnouncement).not.toHaveBeenCalled();
    expect(eventsService.createEvent).not.toHaveBeenCalled();
  });

  it('guarantees notification fixtures omit raw cancellationReason', async () => {
    await service.run();

    const notifCalls = notificationsService.createOrGetHeader.mock.calls;
    for (const [callInput] of notifCalls) {
      expect(callInput).not.toHaveProperty('cancellationReason');
      expect(callInput.snippet).toBeDefined();
      expect(callInput.snippet.length).toBeGreaterThan(0);
    }
  });

  it('ensures device token fixture is fake/demo-only', async () => {
    await service.run();

    expect(notificationsService.registerDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        token: COMMUNITY_DEMO_FAKE_DEVICE_TOKEN,
      }),
    );
  });
});
