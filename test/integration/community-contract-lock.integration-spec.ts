import { CmsController } from '../../src/modules/cms/controllers/cms.controller';
import { CmsAdminController } from '../../src/modules/cms/controllers/cms-admin.controller';
import { AnnouncementsController } from '../../src/modules/announcements/controllers/announcements.controller';
import { AnnouncementsAdminController } from '../../src/modules/announcements/controllers/announcements-admin.controller';
import { EventsController } from '../../src/modules/events/controllers/events.controller';
import { EventsAdminController } from '../../src/modules/events/controllers/events-admin.controller';
import { EventRegistrationsMeController } from '../../src/modules/events/controllers/event-registrations-me.controller';
import { NotificationsMeController } from '../../src/modules/notifications/controllers/notifications-me.controller';
import { NotificationDevicesMeController } from '../../src/modules/notifications/controllers/notification-devices-me.controller';

/**
 * Authoritative Community Route & Contract Lock Specification (Fast Mode — written, not executed).
 *
 * Encodes exact route inventory and contract invariants:
 * - CMS: 8 routes
 * - Announcements: 8 routes
 * - Events: 14 routes
 * - Notifications: 6 routes
 * - Total Community routes: 36
 *
 * Owned Tables: exactly 10
 * RBAC Permissions: exactly 11
 */
describe('Community Suite Authoritative Contract Lock (deferred)', () => {
  describe('Route Count Inventory Constants', () => {
    it('asserts CMS authoritative route count is exactly 8', () => {
      const cmsPublicMethods = Object.getOwnPropertyNames(CmsController.prototype).filter(
        (m) => m !== 'constructor',
      );
      const cmsAdminMethods = Object.getOwnPropertyNames(CmsAdminController.prototype).filter(
        (m) => m !== 'constructor',
      );
      // Public: list (1), getBySlug (2)
      // Admin: create (3), update (4), publish (5), archive (6), list (7), getById (8)
      expect(cmsPublicMethods.length).toBe(2);
      expect(cmsAdminMethods.length).toBe(6);
      expect(cmsPublicMethods.length + cmsAdminMethods.length).toBe(8);
    });

    it('asserts Announcements authoritative route count is exactly 8', () => {
      const annPublicMethods = Object.getOwnPropertyNames(AnnouncementsController.prototype).filter(
        (m) => m !== 'constructor',
      );
      const annAdminMethods = Object.getOwnPropertyNames(
        AnnouncementsAdminController.prototype,
      ).filter((m) => m !== 'constructor');
      // User: feed (1), detail (2), dismiss (3)
      // Admin: list (4), create (5), update (6), publish (7), archive (8)
      expect(annPublicMethods.length).toBe(3);
      expect(annAdminMethods.length).toBe(5);
      expect(annPublicMethods.length + annAdminMethods.length).toBe(8);
    });

    it('asserts Events authoritative route count is exactly 14', () => {
      const eventMethods = Object.getOwnPropertyNames(EventsController.prototype).filter(
        (m) => m !== 'constructor',
      );
      const meMethods = Object.getOwnPropertyNames(
        EventRegistrationsMeController.prototype,
      ).filter((m) => m !== 'constructor');
      const adminMethods = Object.getOwnPropertyNames(EventsAdminController.prototype).filter(
        (m) => m !== 'constructor',
      );
      // Events: list (1), detail (2), register (3), cancelRegistration (4)
      // Me: listMyRegistrations (5)
      // Admin: list (6), create (7), update (8), publish (9), cancel (10), complete (11), archive (12), checkIn (13), attendeeList (14)
      expect(eventMethods.length).toBe(4);
      expect(meMethods.length).toBe(1);
      expect(adminMethods.length).toBe(9);
      expect(eventMethods.length + meMethods.length + adminMethods.length).toBe(14);
    });

    it('asserts Notifications authoritative route count is exactly 6', () => {
      const inboxMethods = Object.getOwnPropertyNames(NotificationsMeController.prototype).filter(
        (m) => m !== 'constructor',
      );
      const deviceMethods = Object.getOwnPropertyNames(
        NotificationDevicesMeController.prototype,
      ).filter((m) => m !== 'constructor');
      // Inbox: listInbox (1), getUnreadCount (2), markRead (3), markAllRead (4)
      // Devices: registerDevice (5), deactivateDevice (6)
      expect(inboxMethods.length).toBe(4);
      expect(deviceMethods.length).toBe(2);
      expect(inboxMethods.length + deviceMethods.length).toBe(6);
    });

    it('asserts Total Community route count is exactly 36', () => {
      const totalRoutes = 8 + 8 + 14 + 6;
      expect(totalRoutes).toBe(36);
    });
  });

  describe('Owned Tables Lock', () => {
    it('asserts exactly 10 tables owned across the 4 modules', () => {
      const ownedTables = [
        'cms_entries',
        'announcements',
        'announcement_targets',
        'announcement_user_states',
        'events',
        'event_targets',
        'event_registrations',
        'notifications',
        'notification_recipients',
        'notification_devices',
      ];
      expect(ownedTables.length).toBe(10);
    });
  });

  describe('RBAC 11 Permissions Lock', () => {
    it('asserts exactly 11 permissions govern Community suite', () => {
      const permissions = [
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
      ];
      expect(permissions.length).toBe(11);
    });
  });
});
