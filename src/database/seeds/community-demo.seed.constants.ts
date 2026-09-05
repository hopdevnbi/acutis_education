export const COMMUNITY_DEMO_SAMPLE_PASSWORD = 'LocalDev!Sample2026' as const;
export const COMMUNITY_DEMO_SUPER_ADMIN_EMAIL = 'superadmin@local.catechism.test' as const;
export const COMMUNITY_DEMO_PARISH_ADMIN_EMAIL = 'admin@local.catechism.test' as const;
export const COMMUNITY_DEMO_CATECHIST_EMAIL = 'catechist@local.catechism.test' as const;
export const COMMUNITY_DEMO_PARENT_EMAIL = 'parent@local.catechism.test' as const;
export const COMMUNITY_DEMO_STUDENT_EMAIL = 'student-alpha@local.catechism.test' as const;

export const COMMUNITY_DEMO_PARISH_CODE = 'GX-TAN-DINH' as const;
export const COMMUNITY_DEMO_CLASS_CODE = 'GL-2026-BAN-1' as const;
export const COMMUNITY_DEMO_STUDENT_ALPHA_NAME = 'Nguyen Van Alpha' as const;

export const COMMUNITY_DEMO_CMS_SLUGS = {
  globalPublishedArticle: 'huong-dan-nam-hoc-giao-ly-2026',
  globalDraftPage: 'gioi-thieu-chuong-trinh-giao-ly',
  parishPublishedNews: 'tin-tuc-giao-xu-tan-dinh-thang-9-2026',
  parishScheduledArticle: 'thong-bao-le-khai-giang-2026',
  globalArchivedArticle: 'tong-ket-nam-hoc-giao-ly-2025',
  globalFeaturedArticle: 'su-diep-dau-nam-hoc-duc-giao-hoang',
} as const;

export const COMMUNITY_DEMO_ANNOUNCEMENT_CODES = {
  globalPublished: 'ANN-DEMO-GLOBAL-PUBLISHED',
  parishPublished: 'ANN-DEMO-PARISH-PUBLISHED',
  classPublished: 'ANN-DEMO-CLASS-PUBLISHED',
  rolePublished: 'ANN-DEMO-ROLE-PUBLISHED',
  parishDraft: 'ANN-DEMO-PARISH-DRAFT',
  globalArchived: 'ANN-DEMO-GLOBAL-ARCHIVED',
} as const;

export const COMMUNITY_DEMO_EVENT_CODES = {
  globalPublished: 'EVT-2026-GLOBAL-CONGRESS',
  parishPublished: 'EVT-2026-PARISH-PICNIC',
  classRegistrationCapacity: 'EVT-2026-CLASS-RETREAT',
  classRegisteredWorkshop: 'EVT-2026-ALTAR-SERVER-WORKSHOP',
  parishCancelled: 'EVT-2026-PARISH-SPORTS-DAY',
  parishCompleted: 'EVT-2026-SUMMER-CAMP-COMPLETED',
  parishDraft: 'EVT-2026-CHRISTMAS-PAGEANT-DRAFT',
  globalArchived: 'EVT-2025-ARCHIVED-CONFERENCE',
} as const;

export const COMMUNITY_DEMO_NOTIFICATION_IDS = {
  announcementPublished: {
    applicationEventId: 'e0000000-0000-0000-0000-000000000001',
    operationKey: 'ANNOUNCEMENT_PUBLISHED:ANN-DEMO-GLOBAL-PUBLISHED',
  },
  eventPublished: {
    applicationEventId: 'e0000000-0000-0000-0000-000000000002',
    operationKey: 'EVENT_PUBLISHED:EVT-2026-GLOBAL-CONGRESS',
  },
  eventUpdated: {
    applicationEventId: 'e0000000-0000-0000-0000-000000000003',
    operationKey: 'EVENT_UPDATED:EVT-2026-ALTAR-SERVER-WORKSHOP:v2',
  },
  eventCancelled: {
    applicationEventId: 'e0000000-0000-0000-0000-000000000004',
    operationKey: 'EVENT_CANCELLED:EVT-2026-PARISH-SPORTS-DAY',
  },
} as const;

export const COMMUNITY_DEMO_FAKE_DEVICE_TOKEN =
  'DEMO_EXPO_PUSH_TOKEN_CATECHIST_NON_ROUTABLE_SAMPLE_2026' as const;
