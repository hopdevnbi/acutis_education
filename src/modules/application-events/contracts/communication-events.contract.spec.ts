import {
  AUTH_RBAC_ROLE_PERMISSION_MATRIX,
  AUTH_RBAC_SEED_PERMISSIONS,
} from '../../../database/seeds/auth-rbac.seed.constants';
import {
  COMMUNICATION_EVENT_TYPES,
  COMMUNICATION_EVENT_TYPE_VALUES,
} from './communication-events.contract';

describe('Community RBAC & Communication Event Contracts', () => {
  const COMMUNITY_PERMISSIONS = [
    'cms.read',
    'cms.manage',
    'announcements.read',
    'announcements.manage',
    'announcements.publish',
    'events.read',
    'events.manage',
    'events.register',
    'events.checkin',
    'notifications.read',
    'notifications.devices',
  ] as const;

  it('contains exactly 11 community permissions in seed constants', () => {
    const seedCodes = new Set(AUTH_RBAC_SEED_PERMISSIONS.map((p) => p.code));
    for (const permission of COMMUNITY_PERMISSIONS) {
      expect(seedCodes.has(permission)).toBe(true);
    }
  });

  it('assigns expected community permissions to SUPER_ADMIN', () => {
    const superAdminPermissions = new Set(AUTH_RBAC_ROLE_PERMISSION_MATRIX['SUPER_ADMIN']);
    for (const permission of COMMUNITY_PERMISSIONS) {
      expect(superAdminPermissions.has(permission)).toBe(true);
    }
  });

  it('assigns expected community permissions to PARISH_ADMIN', () => {
    const parishAdminPermissions = new Set(AUTH_RBAC_ROLE_PERMISSION_MATRIX['PARISH_ADMIN']);
    const expected = [
      'cms.read',
      'cms.manage',
      'announcements.read',
      'announcements.manage',
      'announcements.publish',
      'events.read',
      'events.manage',
      'events.checkin',
      'notifications.read',
      'notifications.devices',
    ];
    for (const permission of expected) {
      expect(parishAdminPermissions.has(permission)).toBe(true);
    }
    // Parish admin does not need default self-registration
    expect(parishAdminPermissions.has('events.register')).toBe(false);
  });

  it('assigns expected community permissions to CATECHIST', () => {
    const catechistPermissions = new Set(AUTH_RBAC_ROLE_PERMISSION_MATRIX['CATECHIST']);
    const expected = [
      'cms.read',
      'announcements.read',
      'announcements.manage',
      'announcements.publish',
      'events.read',
      'events.manage',
      'events.checkin',
      'notifications.read',
      'notifications.devices',
    ];
    for (const permission of expected) {
      expect(catechistPermissions.has(permission)).toBe(true);
    }
  });

  it('assigns expected community permissions to PARENT and STUDENT', () => {
    const parentPermissions = new Set(AUTH_RBAC_ROLE_PERMISSION_MATRIX['PARENT']);
    const studentPermissions = new Set(AUTH_RBAC_ROLE_PERMISSION_MATRIX['STUDENT']);

    const expected = [
      'cms.read',
      'announcements.read',
      'events.read',
      'events.register',
      'notifications.read',
      'notifications.devices',
    ];

    for (const permission of expected) {
      expect(parentPermissions.has(permission)).toBe(true);
      expect(studentPermissions.has(permission)).toBe(true);
    }

    // Parents and Students should NOT have manage/publish/checkin
    const denied = [
      'cms.manage',
      'announcements.manage',
      'announcements.publish',
      'events.manage',
      'events.checkin',
    ];
    for (const permission of denied) {
      expect(parentPermissions.has(permission)).toBe(false);
      expect(studentPermissions.has(permission)).toBe(false);
    }
  });

  it('defines frozen communication event types without PII', () => {
    expect(COMMUNICATION_EVENT_TYPES.AnnouncementPublished).toBe('ANNOUNCEMENT_PUBLISHED');
    expect(COMMUNICATION_EVENT_TYPES.EventPublished).toBe('EVENT_PUBLISHED');
    expect(COMMUNICATION_EVENT_TYPES.EventUpdated).toBe('EVENT_UPDATED');
    expect(COMMUNICATION_EVENT_TYPES.EventCancelled).toBe('EVENT_CANCELLED');
    expect(COMMUNICATION_EVENT_TYPE_VALUES).toHaveLength(4);
  });
});
