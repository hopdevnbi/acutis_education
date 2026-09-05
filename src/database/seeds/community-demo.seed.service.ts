import { Injectable, Logger } from '@nestjs/common';
import { CmsService } from '../../modules/cms/cms.service';
import {
  CmsEntryStatus,
  CmsEntryType,
  CmsScopeType,
} from '../../modules/cms/enums/cms.enums';
import { AnnouncementsService } from '../../modules/announcements/announcements.service';
import {
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
  CommunicationTargetType,
} from '../../modules/announcements/enums/announcement.enums';
import { EventsService } from '../../modules/events/events.service';
import {
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../../modules/events/enums/event.enums';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationSourceType,
  NotificationType,
} from '../../modules/notifications/enums/notification.enums';
import { ClassService } from '../../modules/class/services/class.service';
import { EnrollmentService } from '../../modules/enrollment/services/enrollment.service';
import { ParishService } from '../../modules/parish/services/parish.service';
import { StudentService } from '../../modules/student/services/student.service';
import { UserAccountService } from '../../modules/users/services/user-account.service';
import { AuthRbacSeedService } from './auth-rbac.seed.service';
import { ClassEnrollmentSeedService } from './class-enrollment.seed.service';
import { ParishAcademicSeedService } from './parish-academic.seed.service';
import {
  COMMUNITY_DEMO_ANNOUNCEMENT_CODES,
  COMMUNITY_DEMO_CATECHIST_EMAIL,
  COMMUNITY_DEMO_CLASS_CODE,
  COMMUNITY_DEMO_CMS_SLUGS,
  COMMUNITY_DEMO_EVENT_CODES,
  COMMUNITY_DEMO_FAKE_DEVICE_TOKEN,
  COMMUNITY_DEMO_NOTIFICATION_IDS,
  COMMUNITY_DEMO_PARENT_EMAIL,
  COMMUNITY_DEMO_PARISH_ADMIN_EMAIL,
  COMMUNITY_DEMO_PARISH_CODE,
  COMMUNITY_DEMO_SAMPLE_PASSWORD,
  COMMUNITY_DEMO_STUDENT_ALPHA_NAME,
  COMMUNITY_DEMO_STUDENT_EMAIL,
  COMMUNITY_DEMO_SUPER_ADMIN_EMAIL,
} from './community-demo.seed.constants';

export class CommunityDemoSeedPrerequisiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommunityDemoSeedPrerequisiteError';
  }
}

export interface CommunityDemoSeedSummary {
  readonly superAdminEmail: string;
  readonly parishAdminEmail: string;
  readonly catechistEmail: string;
  readonly parentEmail: string;
  readonly studentEmail: string;
  readonly samplePassword: string;
  readonly parishId: string;
  readonly classId: string;
  readonly studentId: string;
  readonly enrollmentId: string;
  readonly cmsEntriesSeeded: number;
  readonly announcementsSeeded: number;
  readonly eventsSeeded: number;
  readonly eventRegistrationsSeeded: number;
  readonly notificationsSeeded: number;
  readonly notificationRecipientsSeeded: number;
  readonly devicesRegistered: number;
}

@Injectable()
export class CommunityDemoSeedService {
  private readonly logger = new Logger(CommunityDemoSeedService.name);

  constructor(
    private readonly authRbacSeedService: AuthRbacSeedService,
    private readonly parishAcademicSeedService: ParishAcademicSeedService,
    private readonly classEnrollmentSeedService: ClassEnrollmentSeedService,
    private readonly parishService: ParishService,
    private readonly classService: ClassService,
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly userAccountService: UserAccountService,
    private readonly cmsService: CmsService,
    private readonly announcementsService: AnnouncementsService,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async run(): Promise<CommunityDemoSeedSummary> {
    this.logger.log('Starting Community (CMS, Announcements, Events, Notifications) demo seed.');

    // 1. Ensure prerequisite foundation seeds
    await this.authRbacSeedService.run();
    await this.parishAcademicSeedService.run();
    await this.classEnrollmentSeedService.run();

    // 2. Discover foundation entities
    const parish = await this.findDemoParish();
    const demoClass = await this.findDemoClass(parish.id, COMMUNITY_DEMO_CLASS_CODE);
    const alphaStudent = await this.findStudentByName(COMMUNITY_DEMO_STUDENT_ALPHA_NAME);
    const primaryEnrollment = await this.findActiveEnrollment(alphaStudent.id, demoClass.id);

    const superAdmin = await this.requireUser(COMMUNITY_DEMO_SUPER_ADMIN_EMAIL);
    const parishAdmin = await this.requireUser(COMMUNITY_DEMO_PARISH_ADMIN_EMAIL);
    const catechist = await this.requireUser(COMMUNITY_DEMO_CATECHIST_EMAIL);
    const parent = await this.requireUser(
      this.classEnrollmentSeedService.parentEmail ?? COMMUNITY_DEMO_PARENT_EMAIL,
    );
    const studentUser = await this.requireUser(
      this.classEnrollmentSeedService.studentAlphaEmail ?? COMMUNITY_DEMO_STUDENT_EMAIL,
    );

    // 3. Seed CMS Entries
    const cmsCount = await this.seedCmsEntries({
      superAdminId: superAdmin.id,
      parishAdminId: parishAdmin.id,
      parishId: parish.id,
    });

    // 4. Seed Announcements
    const { announcementCount, demoAnnouncements } = await this.seedAnnouncements({
      superAdminId: superAdmin.id,
      parishAdminId: parishAdmin.id,
      catechistId: catechist.id,
      parentId: parent.id,
      studentUserId: studentUser.id,
      parishId: parish.id,
      classId: demoClass.id,
    });

    // 5. Seed Events & Registrations
    const { eventCount, registrationCount, demoEvents } = await this.seedEvents({
      superAdminId: superAdmin.id,
      parishAdminId: parishAdmin.id,
      catechistId: catechist.id,
      parentId: parent.id,
      studentId: alphaStudent.id,
      enrollmentId: primaryEnrollment.id,
      parishId: parish.id,
      classId: demoClass.id,
    });

    // 6. Seed Notifications & Device
    const { notificationCount, recipientCount, deviceCount } = await this.seedNotifications({
      superAdminId: superAdmin.id,
      parishAdminId: parishAdmin.id,
      catechistId: catechist.id,
      parentId: parent.id,
      studentUserId: studentUser.id,
      announcementGlobalId: demoAnnouncements.globalPublishedId,
      eventGlobalId: demoEvents.globalCongressId,
      eventWorkshopId: demoEvents.workshopId,
      eventSportsId: demoEvents.sportsId,
    });

    this.logger.log('Community demo seed finished successfully.');

    return {
      superAdminEmail: COMMUNITY_DEMO_SUPER_ADMIN_EMAIL,
      parishAdminEmail: COMMUNITY_DEMO_PARISH_ADMIN_EMAIL,
      catechistEmail: COMMUNITY_DEMO_CATECHIST_EMAIL,
      parentEmail: parent.email,
      studentEmail: studentUser.email,
      samplePassword: COMMUNITY_DEMO_SAMPLE_PASSWORD,
      parishId: parish.id,
      classId: demoClass.id,
      studentId: alphaStudent.id,
      enrollmentId: primaryEnrollment.id,
      cmsEntriesSeeded: cmsCount,
      announcementsSeeded: announcementCount,
      eventsSeeded: eventCount,
      eventRegistrationsSeeded: registrationCount,
      notificationsSeeded: notificationCount,
      notificationRecipientsSeeded: recipientCount,
      devicesRegistered: deviceCount,
    };
  }

  // --- CMS Seeding ---

  private async seedCmsEntries(ctx: {
    superAdminId: string;
    parishAdminId: string;
    parishId: string;
  }): Promise<number> {
    const existingList = await this.cmsService.findAdminList({
      isSuperAdmin: true,
      adminParishIds: [ctx.parishId],
      page: 1,
      limit: 50,
    });
    const existingSlugs = new Set(existingList.items.map((i) => `${i.scopeKey}:${i.slug}`));

    let count = 0;

    // 1. Global Published Article
    const key1 = `GLOBAL:${COMMUNITY_DEMO_CMS_SLUGS.globalPublishedArticle}`;
    if (!existingSlugs.has(key1)) {
      const entry = await this.cmsService.createEntry({
        type: CmsEntryType.Article,
        scopeType: CmsScopeType.Global,
        slug: COMMUNITY_DEMO_CMS_SLUGS.globalPublishedArticle,
        title: 'Hướng dẫn Năm học Giáo lý 2026 - 2027',
        summary: 'Quy định và hướng dẫn chung về chương trình giáo lý thiếu nhi niên khóa 2026.',
        body: 'Nội dung chi tiết tài liệu học tập, nội quy lớp học và sinh hoạt giáo lý tại các giáo xứ.',
        locale: 'vi-VN',
        isFeatured: false,
        authorUserId: ctx.superAdminId,
      });
      await this.cmsService.publishEntry(entry.id, ctx.superAdminId);
      count += 1;
    }

    // 2. Global Draft Page
    const key2 = `GLOBAL:${COMMUNITY_DEMO_CMS_SLUGS.globalDraftPage}`;
    if (!existingSlugs.has(key2)) {
      await this.cmsService.createEntry({
        type: CmsEntryType.Page,
        scopeType: CmsScopeType.Global,
        slug: COMMUNITY_DEMO_CMS_SLUGS.globalDraftPage,
        title: 'Giới thiệu Chương trình Giáo lý Phổ thông',
        summary: 'Tổng quan sứ mạng giáo dục đức tin thiếu nhi.',
        body: 'Giới thiệu khung chương trình đào tạo đức tin từ Khai Tâm đến Thêm Sức theo quy chuẩn giáo phận.',
        locale: 'vi-VN',
        isFeatured: false,
        authorUserId: ctx.superAdminId,
      });
      count += 1;
    }

    // 3. Parish Published News
    const key3 = `PARISH:${ctx.parishId.toLowerCase()}:${COMMUNITY_DEMO_CMS_SLUGS.parishPublishedNews}`;
    if (!existingSlugs.has(key3)) {
      const entry = await this.cmsService.createEntry({
        type: CmsEntryType.News,
        scopeType: CmsScopeType.Parish,
        parishId: ctx.parishId,
        slug: COMMUNITY_DEMO_CMS_SLUGS.parishPublishedNews,
        title: 'Tin tức Giáo xứ Tân Định - Tháng 09/2026',
        summary: 'Cập nhật sinh hoạt phụng vụ và giáo lý trong tháng tại giáo xứ.',
        body: 'Các lớp giáo lý bắt đầu sinh hoạt hàng tuần vào Chúa nhật sau Thánh lễ thiếu nhi 07:00.',
        locale: 'vi-VN',
        isFeatured: false,
        authorUserId: ctx.parishAdminId,
      });
      await this.cmsService.publishEntry(entry.id, ctx.parishAdminId);
      count += 1;
    }

    // 4. Parish Scheduled Article
    const key4 = `PARISH:${ctx.parishId.toLowerCase()}:${COMMUNITY_DEMO_CMS_SLUGS.parishScheduledArticle}`;
    if (!existingSlugs.has(key4)) {
      await this.cmsService.createEntry({
        type: CmsEntryType.Article,
        scopeType: CmsScopeType.Parish,
        parishId: ctx.parishId,
        slug: COMMUNITY_DEMO_CMS_SLUGS.parishScheduledArticle,
        title: 'Thông báo Lễ Khai giảng Năm học Giáo lý',
        summary: 'Bài viết đã lên lịch xuất bản tự động vào đầu tháng 10/2026.',
        body: 'Thời gian tập trung đón học viên và phụ huynh tại hội trường giáo xứ lúc 08:00 sáng.',
        locale: 'vi-VN',
        scheduledFor: new Date('2026-10-01T08:00:00.000Z'),
        isFeatured: false,
        authorUserId: ctx.parishAdminId,
      });
      count += 1;
    }

    // 5. Global Archived Article
    const key5 = `GLOBAL:${COMMUNITY_DEMO_CMS_SLUGS.globalArchivedArticle}`;
    if (!existingSlugs.has(key5)) {
      const entry = await this.cmsService.createEntry({
        type: CmsEntryType.Article,
        scopeType: CmsScopeType.Global,
        slug: COMMUNITY_DEMO_CMS_SLUGS.globalArchivedArticle,
        title: 'Tổng kết Năm học Giáo lý 2025',
        summary: 'Báo cáo tổng kết sinh hoạt giáo lý niên khóa trước.',
        body: 'Đánh giá kết quả học tập và khen thưởng các em thiếu nhi hoàn thành xuất sắc chương trình.',
        locale: 'vi-VN',
        isFeatured: false,
        authorUserId: ctx.superAdminId,
      });
      await this.cmsService.publishEntry(entry.id, ctx.superAdminId);
      await this.cmsService.archiveEntry(entry.id, ctx.superAdminId);
      count += 1;
    }

    // 6. Global Featured Article
    const key6 = `GLOBAL:${COMMUNITY_DEMO_CMS_SLUGS.globalFeaturedArticle}`;
    if (!existingSlugs.has(key6)) {
      const entry = await this.cmsService.createEntry({
        type: CmsEntryType.Article,
        scopeType: CmsScopeType.Global,
        slug: COMMUNITY_DEMO_CMS_SLUGS.globalFeaturedArticle,
        title: 'Sứ điệp Đầu Năm học của Đức Thánh Cha',
        summary: 'Thông điệp gửi đến toàn thể các bạn thiếu nhi và giáo lý viên.',
        body: 'Hãy là những tông đồ nhỏ bé của lòng thương xót và niềm vui Tin Mừng giữa cuộc sống học đường.',
        locale: 'vi-VN',
        isFeatured: true,
        authorUserId: ctx.superAdminId,
      });
      await this.cmsService.publishEntry(entry.id, ctx.superAdminId);
      count += 1;
    }

    return count;
  }

  // --- Announcements Seeding ---

  private async seedAnnouncements(ctx: {
    superAdminId: string;
    parishAdminId: string;
    catechistId: string;
    parentId: string;
    studentUserId: string;
    parishId: string;
    classId: string;
  }): Promise<{
    announcementCount: number;
    demoAnnouncements: { globalPublishedId?: string };
  }> {
    const existingList = await this.announcementsService.findAdminList({
      isSuperAdmin: true,
      page: 1,
      limit: 50,
    });
    const existingTitles = new Map(existingList.items.map((i) => [i.announcement.title, i.announcement.id]));

    let count = 0;
    const demoAnnouncements: { globalPublishedId?: string } = {};

    // 1. Global Published Announcement
    const title1 = '[Toàn thể] Khai mạc Tuần lễ Thiếu nhi 2026';
    let ann1Id = existingTitles.get(title1);
    if (!ann1Id) {
      const created = await this.announcementsService.createAnnouncement({
        title: title1,
        summary: 'Chương trình khai mạc tuần lễ sinh hoạt dành cho toàn giáo phận.',
        body: 'Kính mời quý phụ huynh và các em thiếu nhi tham dự đông đủ trong trang phục đồng phục.',
        scopeType: AnnouncementScopeType.Global,
        priority: AnnouncementPriority.High,
        locale: 'vi-VN',
        targets: [{ targetType: CommunicationTargetType.Global }],
        authorUserId: ctx.superAdminId,
      });
      await this.announcementsService.publishAnnouncement(created.announcement.id, ctx.superAdminId);
      ann1Id = created.announcement.id;
      count += 1;
    }
    demoAnnouncements.globalPublishedId = ann1Id;

    // 2. Parish Published Announcement
    const title2 = '[Tân Định] Lịch Họp Phụ Huynh Đầu Năm';
    let ann2Id = existingTitles.get(title2);
    if (!ann2Id) {
      const created = await this.announcementsService.createAnnouncement({
        title: title2,
        summary: 'Gặp gỡ phụ huynh các khối Khai Tâm và Thêm Sức.',
        body: 'Buổi họp diễn ra lúc 09:00 Chúa nhật tuần tới tại hội trường giáo xứ.',
        scopeType: AnnouncementScopeType.Parish,
        parishId: ctx.parishId,
        priority: AnnouncementPriority.Normal,
        locale: 'vi-VN',
        targets: [
          {
            targetType: CommunicationTargetType.Parish,
            parishId: ctx.parishId,
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      await this.announcementsService.publishAnnouncement(created.announcement.id, ctx.parishAdminId);
      ann2Id = created.announcement.id;
      count += 1;
    }

    // 3. Class Published Announcement
    const title3 = '[Lớp GL-BAN-1] Chuẩn bị Tài liệu Học tập Bài 1';
    let ann3Id = existingTitles.get(title3);
    if (!ann3Id) {
      const created = await this.announcementsService.createAnnouncement({
        title: title3,
        summary: 'Các em nhớ mang sách bài tập và kinh nguyện vào Chúa nhật.',
        body: 'Giáo lý viên phụ trách lớp nhắc nhở các em chuẩn bị tập vở đầy đủ và đi học đúng giờ.',
        scopeType: AnnouncementScopeType.Parish,
        parishId: ctx.parishId,
        priority: AnnouncementPriority.Normal,
        locale: 'vi-VN',
        targets: [
          {
            targetType: CommunicationTargetType.Class,
            parishId: ctx.parishId,
            classId: ctx.classId,
          },
        ],
        authorUserId: ctx.catechistId,
      });
      await this.announcementsService.publishAnnouncement(created.announcement.id, ctx.catechistId);
      ann3Id = created.announcement.id;
      count += 1;
    }

    // 4. Role Published Announcement
    const title4 = '[Giáo Lý Viên] Tập huấn Phương pháp Sư phạm Giáo lý Mới';
    if (!existingTitles.has(title4)) {
      const created = await this.announcementsService.createAnnouncement({
        title: title4,
        summary: 'Khóa tập huấn chuyên môn định kỳ dành cho toàn thể ban giáo lý viên.',
        body: 'Nội dung tập huấn cập nhật phương pháp truyền đạt và ứng dụng kỹ thuật số trong giảng dạy giáo lý.',
        scopeType: AnnouncementScopeType.Parish,
        parishId: ctx.parishId,
        priority: AnnouncementPriority.Urgent,
        locale: 'vi-VN',
        targets: [
          {
            targetType: CommunicationTargetType.Role,
            roleCode: 'CATECHIST',
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      await this.announcementsService.publishAnnouncement(created.announcement.id, ctx.parishAdminId);
      count += 1;
    }

    // 5. Parish Draft Announcement
    const title5 = '[Dự thảo] Kế hoạch Dã ngoại Mùa Chay';
    if (!existingTitles.has(title5)) {
      await this.announcementsService.createAnnouncement({
        title: title5,
        summary: 'Bản dự thảo kế hoạch sinh hoạt ngoại khóa mùa chay.',
        body: 'Chi tiết lộ trình, phân công giáo lý viên hỗ trợ và dự trù chi phí.',
        scopeType: AnnouncementScopeType.Parish,
        parishId: ctx.parishId,
        priority: AnnouncementPriority.Low,
        locale: 'vi-VN',
        targets: [
          {
            targetType: CommunicationTargetType.Parish,
            parishId: ctx.parishId,
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      count += 1;
    }

    // 6. Global Archived Announcement
    const title6 = '[Lưu trữ] Thông báo Nghỉ Tết Nguyên Đán 2026';
    if (!existingTitles.has(title6)) {
      const created = await this.announcementsService.createAnnouncement({
        title: title6,
        summary: 'Thông báo lịch nghỉ tết niên khóa trước đã hoàn tất.',
        body: 'Toàn thể học viên nghỉ sinh hoạt từ 23 tháng chạp đến mùng 10 tháng giêng.',
        scopeType: AnnouncementScopeType.Global,
        priority: AnnouncementPriority.Normal,
        locale: 'vi-VN',
        targets: [{ targetType: CommunicationTargetType.Global }],
        authorUserId: ctx.superAdminId,
      });
      await this.announcementsService.publishAnnouncement(created.announcement.id, ctx.superAdminId);
      await this.announcementsService.archiveAnnouncement(created.announcement.id, ctx.superAdminId);
      count += 1;
    }

    // Limited User State examples (idempotent mark read / dismiss)
    if (ann1Id) {
      await this.announcementsService.markRead(ann1Id, ctx.parentId);
    }
    if (ann2Id) {
      await this.announcementsService.dismissAnnouncement(ann2Id, ctx.studentUserId);
    }

    return { announcementCount: count, demoAnnouncements };
  }

  // --- Events Seeding ---

  private async seedEvents(ctx: {
    superAdminId: string;
    parishAdminId: string;
    catechistId: string;
    parentId: string;
    studentId: string;
    enrollmentId: string;
    parishId: string;
    classId: string;
  }): Promise<{
    eventCount: number;
    registrationCount: number;
    demoEvents: {
      globalCongressId?: string;
      workshopId?: string;
      sportsId?: string;
    };
  }> {
    let eventCount = 0;
    let registrationCount = 0;
    const demoEvents: {
      globalCongressId?: string;
      workshopId?: string;
      sportsId?: string;
    } = {};

    // 1. Global Published Future Event
    let event1 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.globalPublished,
    );
    if (!event1) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.globalPublished,
        title: 'Đại hội Thiếu nhi Giáo phận 2026',
        description: 'Ngày hội quy tụ thiếu nhi các giáo xứ gặp gỡ và giao lưu đức tin.',
        summary: 'Đại hội thường niên quy mô toàn giáo phận.',
        scopeType: EventScopeType.Global,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-11-20T08:00:00.000Z'),
        endsAt: new Date('2026-11-20T17:00:00.000Z'),
        venueName: 'Trung tâm Mục vụ Giáo phận',
        capacity: null,
        isRegistrationRequired: false,
        targets: [{ targetType: CommunicationTargetType.Global }],
        authorUserId: ctx.superAdminId,
      });
      const published = await this.eventsService.publishEvent(created.event.id, ctx.superAdminId);
      event1 = published.event;
      eventCount += 1;
    }
    demoEvents.globalCongressId = event1.id;

    // 2. Parish Published Future Event
    let event2 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.parishPublished,
    );
    if (!event2) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.parishPublished,
        title: 'Hội chợ Vui Học Giáo lý Tân Định',
        description: 'Gian hàng trò chơi dân gian và đố vui giáo lý có thưởng.',
        summary: 'Sinh hoạt vui học ngoài trời tại khuôn viên giáo xứ.',
        scopeType: EventScopeType.Parish,
        parishId: ctx.parishId,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-10-15T08:00:00.000Z'),
        endsAt: new Date('2026-10-15T12:00:00.000Z'),
        venueName: 'Sân nhà xứ Tân Định',
        capacity: null,
        isRegistrationRequired: false,
        targets: [
          {
            targetType: CommunicationTargetType.Parish,
            parishId: ctx.parishId,
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      await this.eventsService.publishEvent(created.event.id, ctx.parishAdminId);
      eventCount += 1;
    }

    // 3. Class Published Registration-Enabled Event with Capacity
    let event3 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.classRegistrationCapacity,
    );
    if (!event3) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.classRegistrationCapacity,
        title: 'Tĩnh tâm Đầu Năm Học Lớp GL-BAN-1',
        description: 'Buổi tĩnh tâm và xưng tội đầu năm học dành cho học viên lớp 1.',
        summary: 'Tĩnh tâm định hướng sống đức tin đầu niên khóa.',
        scopeType: EventScopeType.Class,
        parishId: ctx.parishId,
        classId: ctx.classId,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-10-25T14:00:00.000Z'),
        endsAt: new Date('2026-10-25T17:30:00.000Z'),
        venueName: 'Phòng học Giáo lý 01',
        capacity: 30,
        isRegistrationRequired: true,
        registrationDeadline: new Date('2026-10-24T23:59:59.000Z'),
        targets: [
          {
            targetType: CommunicationTargetType.Class,
            parishId: ctx.parishId,
            classId: ctx.classId,
          },
        ],
        authorUserId: ctx.catechistId,
      });
      await this.eventsService.publishEvent(created.event.id, ctx.catechistId);
      eventCount += 1;
    }

    // 4. Class Published Event with Registrations
    let event4 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.classRegisteredWorkshop,
    );
    if (!event4) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.classRegisteredWorkshop,
        title: 'Tập huấn Lễ sinh và Phụng vụ Lớp GL-BAN-1',
        description: 'Hướng dẫn nghi thức giúp lễ và thái độ phụng vụ thánh thể.',
        summary: 'Tập huấn kỹ năng tham dự bàn thánh.',
        scopeType: EventScopeType.Class,
        parishId: ctx.parishId,
        classId: ctx.classId,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-11-05T09:00:00.000Z'),
        endsAt: new Date('2026-11-05T11:00:00.000Z'),
        venueName: 'Nhà thờ Tân Định',
        capacity: 20,
        isRegistrationRequired: true,
        registrationDeadline: new Date('2026-11-04T23:59:59.000Z'),
        targets: [
          {
            targetType: CommunicationTargetType.Class,
            parishId: ctx.parishId,
            classId: ctx.classId,
          },
        ],
        authorUserId: ctx.catechistId,
      });
      const published = await this.eventsService.publishEvent(created.event.id, ctx.catechistId);
      event4 = published.event;
      eventCount += 1;

      // Seed self-registration (Catechist)
      try {
        await this.eventsService.register(event4, ctx.catechistId);
        registrationCount += 1;
      } catch {
        // Idempotent catch
      }

      // Seed parent linked-child registration (Student Alpha)
      try {
        await this.eventsService.register(
          event4,
          ctx.parentId,
          ctx.studentId,
          ctx.enrollmentId,
        );
        registrationCount += 1;
      } catch {
        // Idempotent catch
      }
    }
    demoEvents.workshopId = event4.id;

    // 5. Parish Cancelled Event
    let event5 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.parishCancelled,
    );
    if (!event5) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.parishCancelled,
        title: 'Ngày hội Thể thao Thiếu nhi Tân Định',
        description: 'Thi đấu thể thao bóng đá và cầu lông giữa các khối lớp.',
        summary: 'Tạm hoãn do thời tiết mưa bão.',
        scopeType: EventScopeType.Parish,
        parishId: ctx.parishId,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-10-18T08:00:00.000Z'),
        endsAt: new Date('2026-10-18T16:00:00.000Z'),
        capacity: null,
        isRegistrationRequired: false,
        targets: [
          {
            targetType: CommunicationTargetType.Parish,
            parishId: ctx.parishId,
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      await this.eventsService.publishEvent(created.event.id, ctx.parishAdminId);
      const cancelled = await this.eventsService.cancelEvent(
        created.event.id,
        'Tạm hoãn do thời tiết mưa bão kéo dài',
        ctx.parishAdminId,
      );
      event5 = cancelled.event;
      eventCount += 1;
    }
    demoEvents.sportsId = event5.id;

    // 6. Parish Completed Event with Attended Registration
    let event6 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.parishCompleted,
    );
    if (!event6) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.parishCompleted,
        title: 'Trại hè Hướng tâm 2026 (Đã Hoàn tất)',
        description: 'Trại hè sinh hoạt kết thúc niên khóa hè 2026.',
        summary: 'Sinh hoạt trại hè đã hoàn thành tốt đẹp.',
        scopeType: EventScopeType.Parish,
        parishId: ctx.parishId,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-08-10T08:00:00.000Z'),
        endsAt: new Date('2026-08-12T17:00:00.000Z'),
        capacity: 50,
        isRegistrationRequired: true,
        registrationDeadline: new Date('2026-08-05T23:59:59.000Z'),
        targets: [
          {
            targetType: CommunicationTargetType.Parish,
            parishId: ctx.parishId,
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      const published = await this.eventsService.publishEvent(created.event.id, ctx.parishAdminId);

      // Register and check-in Student Alpha
      try {
        const reg = await this.eventsService.register(
          published.event,
          ctx.parentId,
          ctx.studentId,
          ctx.enrollmentId,
        );
        registrationCount += 1;
        await this.eventsService.checkIn(published.event.id, reg.id);
      } catch {
        // Idempotent catch
      }

      await this.eventsService.completeEvent(created.event.id, ctx.parishAdminId);
      eventCount += 1;
    }

    // 7. Parish Draft Event
    const event7 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.parishDraft,
    );
    if (!event7) {
      await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.parishDraft,
        title: '[Dự thảo] Diễn nguyện Giáng Sinh 2026',
        description: 'Kế hoạch tổ chức đêm diễn nguyện canh thức Giáng Sinh.',
        summary: 'Dự thảo kịch bản và phân vai thiếu nhi.',
        scopeType: EventScopeType.Parish,
        parishId: ctx.parishId,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2026-12-24T19:00:00.000Z'),
        endsAt: new Date('2026-12-24T22:00:00.000Z'),
        capacity: null,
        isRegistrationRequired: false,
        targets: [
          {
            targetType: CommunicationTargetType.Parish,
            parishId: ctx.parishId,
          },
        ],
        authorUserId: ctx.parishAdminId,
      });
      eventCount += 1;
    }

    // 8. Global Archived Event
    const event8 = await this.eventsService.findEventByCode(
      COMMUNITY_DEMO_EVENT_CODES.globalArchived,
    );
    if (!event8) {
      const created = await this.eventsService.createEvent({
        code: COMMUNITY_DEMO_EVENT_CODES.globalArchived,
        title: '[Lưu trữ] Hội thảo Huynh trưởng và Giáo lý viên 2025',
        description: 'Hội thảo thường niên niên khóa 2024 - 2025.',
        summary: 'Hồ sơ sự kiện đã hoàn tất lưu trữ.',
        scopeType: EventScopeType.Global,
        locale: 'vi-VN',
        timezone: 'Asia/Ho_Chi_Minh',
        startsAt: new Date('2025-09-15T08:00:00.000Z'),
        endsAt: new Date('2025-09-15T17:00:00.000Z'),
        capacity: null,
        isRegistrationRequired: false,
        targets: [{ targetType: CommunicationTargetType.Global }],
        authorUserId: ctx.superAdminId,
      });
      await this.eventsService.publishEvent(created.event.id, ctx.superAdminId);
      await this.eventsService.completeEvent(created.event.id, ctx.superAdminId);
      await this.eventsService.archiveEvent(created.event.id, ctx.superAdminId);
      eventCount += 1;
    }

    return { eventCount, registrationCount, demoEvents };
  }

  // --- Notifications Seeding ---

  private async seedNotifications(ctx: {
    superAdminId: string;
    parishAdminId: string;
    catechistId: string;
    parentId: string;
    studentUserId: string;
    announcementGlobalId?: string;
    eventGlobalId?: string;
    eventWorkshopId?: string;
    eventSportsId?: string;
  }): Promise<{
    notificationCount: number;
    recipientCount: number;
    deviceCount: number;
  }> {
    let notificationCount = 0;
    let recipientCount = 0;
    let deviceCount = 0;

    // 1. ANNOUNCEMENT_PUBLISHED Notification
    const h1 = await this.notificationsService.createOrGetHeader({
      applicationEventId: COMMUNITY_DEMO_NOTIFICATION_IDS.announcementPublished.applicationEventId,
      operationKey: COMMUNITY_DEMO_NOTIFICATION_IDS.announcementPublished.operationKey,
      sourceType: NotificationSourceType.Announcement,
      sourceId: ctx.announcementGlobalId ?? 'a0000000-0000-0000-0000-000000000001',
      notificationType: NotificationType.AnnouncementPublished,
      title: '[Thông báo] Khai mạc Tuần lễ Thiếu nhi 2026',
      snippet: 'Chương trình khai mạc tuần lễ sinh hoạt dành cho toàn giáo phận.',
      actionUrl: `/announcements/${ctx.announcementGlobalId ?? 'a0000000-0000-0000-0000-000000000001'}`,
    });
    if (h1.isNew) {
      notificationCount += 1;
    }
    const recipients1 = [ctx.superAdminId, ctx.parishAdminId, ctx.catechistId, ctx.parentId, ctx.studentUserId];
    const inserted1 = await this.notificationsService.fanOutRecipients(h1.notification.id, recipients1);
    recipientCount += inserted1;
    // Mark one as read for Parent
    try {
      await this.notificationsService.markRead(h1.notification.id, ctx.parentId);
    } catch {
      // Idempotent catch
    }

    // 2. EVENT_PUBLISHED Notification
    const h2 = await this.notificationsService.createOrGetHeader({
      applicationEventId: COMMUNITY_DEMO_NOTIFICATION_IDS.eventPublished.applicationEventId,
      operationKey: COMMUNITY_DEMO_NOTIFICATION_IDS.eventPublished.operationKey,
      sourceType: NotificationSourceType.Event,
      sourceId: ctx.eventGlobalId ?? 'e0000000-0000-0000-0000-000000000001',
      notificationType: NotificationType.EventPublished,
      title: '[Sự kiện] Đại hội Thiếu nhi Giáo phận 2026',
      snippet: 'Đại hội thường niên quy mô toàn giáo phận diễn ra vào tháng 11/2026.',
      actionUrl: `/events/${ctx.eventGlobalId ?? 'e0000000-0000-0000-0000-000000000001'}`,
    });
    if (h2.isNew) {
      notificationCount += 1;
    }
    const recipients2 = [ctx.catechistId, ctx.parentId, ctx.studentUserId];
    const inserted2 = await this.notificationsService.fanOutRecipients(h2.notification.id, recipients2);
    recipientCount += inserted2;
    // Mark read for Catechist
    try {
      await this.notificationsService.markRead(h2.notification.id, ctx.catechistId);
    } catch {
      // Idempotent catch
    }

    // 3. EVENT_UPDATED Notification
    const h3 = await this.notificationsService.createOrGetHeader({
      applicationEventId: COMMUNITY_DEMO_NOTIFICATION_IDS.eventUpdated.applicationEventId,
      operationKey: COMMUNITY_DEMO_NOTIFICATION_IDS.eventUpdated.operationKey,
      sourceType: NotificationSourceType.Event,
      sourceId: ctx.eventWorkshopId ?? 'e0000000-0000-0000-0000-000000000002',
      notificationType: NotificationType.EventUpdated,
      title: '[Cập nhật] Tập huấn Lễ sinh và Phụng vụ Lớp GL-BAN-1',
      snippet: 'Thông tin địa điểm tập huấn đã được xác nhận tại Nhà thờ Tân Định.',
      actionUrl: `/events/${ctx.eventWorkshopId ?? 'e0000000-0000-0000-0000-000000000002'}`,
    });
    if (h3.isNew) {
      notificationCount += 1;
    }
    const recipients3 = [ctx.catechistId, ctx.parentId];
    const inserted3 = await this.notificationsService.fanOutRecipients(h3.notification.id, recipients3);
    recipientCount += inserted3;

    // 4. EVENT_CANCELLED Notification
    const h4 = await this.notificationsService.createOrGetHeader({
      applicationEventId: COMMUNITY_DEMO_NOTIFICATION_IDS.eventCancelled.applicationEventId,
      operationKey: COMMUNITY_DEMO_NOTIFICATION_IDS.eventCancelled.operationKey,
      sourceType: NotificationSourceType.Event,
      sourceId: ctx.eventSportsId ?? 'e0000000-0000-0000-0000-000000000003',
      notificationType: NotificationType.EventCancelled,
      title: '[Đã hủy] Ngày hội Thể thao Thiếu nhi Tân Định',
      snippet: 'Sự kiện đã bị hủy bỏ: Tạm hoãn do thời tiết mưa bão.',
      actionUrl: `/events/${ctx.eventSportsId ?? 'e0000000-0000-0000-0000-000000000003'}`,
    });
    if (h4.isNew) {
      notificationCount += 1;
    }
    const recipients4 = [ctx.parishAdminId, ctx.catechistId, ctx.parentId];
    const inserted4 = await this.notificationsService.fanOutRecipients(h4.notification.id, recipients4);
    recipientCount += inserted4;

    // 5. Device Registry
    try {
      await this.notificationsService.registerDevice({
        userId: ctx.catechistId,
        platform: NotificationDevicePlatform.Ios,
        provider: NotificationDeviceProvider.Expo,
        token: COMMUNITY_DEMO_FAKE_DEVICE_TOKEN,
        appVersion: '1.0.0',
        locale: 'vi-VN',
      });
      deviceCount += 1;
    } catch {
      // Idempotent catch
    }

    return { notificationCount, recipientCount, deviceCount };
  }

  // --- Helpers ---

  private async findDemoParish(): Promise<{ id: string; code: string; name: string }> {
    const parishes = await this.parishService.listParishes();
    const parish = parishes.find((p) => p.code === COMMUNITY_DEMO_PARISH_CODE);
    if (!parish) {
      throw new CommunityDemoSeedPrerequisiteError(
        `Demo parish '${COMMUNITY_DEMO_PARISH_CODE}' not found. Re-run npm run seed:parish-academic.`,
      );
    }
    return parish;
  }

  private async findDemoClass(
    parishId: string,
    classCode: string,
  ): Promise<{ id: string; code: string; parishId: string }> {
    const classes = await this.classService.listClasses({ parishId });
    const match = classes.find((c) => c.code === classCode);
    if (!match) {
      throw new CommunityDemoSeedPrerequisiteError(
        `Demo class '${classCode}' not found in parish. Re-run npm run seed:class-enrollment.`,
      );
    }
    return match;
  }

  private async findStudentByName(fullName: string): Promise<{ id: string; fullName: string }> {
    const students = await this.studentService.listStudents();
    const match = students.find((s) => s.fullName === fullName);
    if (!match) {
      throw new CommunityDemoSeedPrerequisiteError(
        `Demo student '${fullName}' not found. Re-run npm run seed:class-enrollment.`,
      );
    }
    return match;
  }

  private async findActiveEnrollment(
    studentId: string,
    classId: string,
  ): Promise<{ id: string; studentId: string; classId: string }> {
    const enrollments = await this.enrollmentService.listEnrollments({ studentId, classId });
    const match = enrollments.items.find((e) => e.status === 'ACTIVE');
    if (!match) {
      throw new CommunityDemoSeedPrerequisiteError(
        `Active enrollment not found for student '${studentId}' in class '${classId}'. Re-run npm run seed:class-enrollment.`,
      );
    }
    return match;
  }

  private async requireUser(email: string): Promise<{ id: string; email: string }> {
    const account = await this.userAccountService.getAccountSnapshotByEmail(email);
    if (!account) {
      throw new CommunityDemoSeedPrerequisiteError(
        `Required demo user '${email}' not found. Re-run npm run seed:auth-rbac.`,
      );
    }
    return { id: account.id, email: account.email };
  }
}
