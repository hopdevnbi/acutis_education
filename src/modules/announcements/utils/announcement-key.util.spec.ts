import { CommunicationTargetType, AnnouncementPriority, AnnouncementStatus } from '../enums/announcement.enums';
import { InvalidAnnouncementTargetError } from '../errors/announcement.errors';
import { buildAnnouncementTargetKey } from './announcement-key.util';

describe('AnnouncementKeyUtil', () => {
  describe('buildAnnouncementTargetKey', () => {
    it('returns GLOBAL for Global target when no extra attributes are provided', () => {
      const key = buildAnnouncementTargetKey({
        targetType: CommunicationTargetType.Global,
      });
      expect(key).toBe('GLOBAL');
    });

    it('throws when Global target specifies parish or class or role', () => {
      expect(() =>
        buildAnnouncementTargetKey({
          targetType: CommunicationTargetType.Global,
          parishId: '11111111-1111-4111-8111-111111111111',
        }),
      ).toThrow(InvalidAnnouncementTargetError);
    });

    it('returns PARISH:<parishId> for Parish target', () => {
      const parishId = '11111111-1111-4111-8111-111111111111';
      const key = buildAnnouncementTargetKey({
        targetType: CommunicationTargetType.Parish,
        parishId,
      });
      expect(key).toBe(`PARISH:${parishId.toLowerCase()}`);
    });

    it('throws when Parish target lacks parishId', () => {
      expect(() =>
        buildAnnouncementTargetKey({
          targetType: CommunicationTargetType.Parish,
        }),
      ).toThrow(InvalidAnnouncementTargetError);
    });

    it('returns CLASS:<classId> for Class target', () => {
      const classId = '22222222-2222-4222-8222-222222222222';
      const key = buildAnnouncementTargetKey({
        targetType: CommunicationTargetType.Class,
        classId,
      });
      expect(key).toBe(`CLASS:${classId.toLowerCase()}`);
    });

    it('throws when Class target lacks classId', () => {
      expect(() =>
        buildAnnouncementTargetKey({
          targetType: CommunicationTargetType.Class,
        }),
      ).toThrow(InvalidAnnouncementTargetError);
    });

    it('returns ROLE:<parishId>:<roleCode> for Role target with parishId', () => {
      const parishId = '11111111-1111-4111-8111-111111111111';
      const key = buildAnnouncementTargetKey({
        targetType: CommunicationTargetType.Role,
        parishId,
        roleCode: 'catechist',
      });
      expect(key).toBe(`ROLE:${parishId.toLowerCase()}:CATECHIST`);
    });

    it('throws when Role target lacks parishId in MVP', () => {
      expect(() =>
        buildAnnouncementTargetKey({
          targetType: CommunicationTargetType.Role,
          roleCode: 'PARENT',
        }),
      ).toThrow(InvalidAnnouncementTargetError);
    });

    it('throws when Role target lacks roleCode', () => {
      expect(() =>
        buildAnnouncementTargetKey({
          targetType: CommunicationTargetType.Role,
          parishId: '11111111-1111-4111-8111-111111111111',
          roleCode: '',
        }),
      ).toThrow(InvalidAnnouncementTargetError);
    });
  });

  describe('enums', () => {
    it('contains expected status and priority values', () => {
      expect(Object.values(AnnouncementStatus)).toEqual(
        expect.arrayContaining(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
      );
      expect(Object.values(AnnouncementPriority)).toEqual(
        expect.arrayContaining(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
      );
    });
  });
});
