export const ANNOUNCEMENTS_READ_PERMISSION = 'announcements.read' as const;
export const ANNOUNCEMENTS_MANAGE_PERMISSION = 'announcements.manage' as const;
export const ANNOUNCEMENTS_PUBLISH_PERMISSION = 'announcements.publish' as const;

export const ANNOUNCEMENTS_PERMISSIONS = [
  ANNOUNCEMENTS_READ_PERMISSION,
  ANNOUNCEMENTS_MANAGE_PERMISSION,
  ANNOUNCEMENTS_PUBLISH_PERMISSION,
] as const;

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200 as const;
export const ANNOUNCEMENT_SUMMARY_MAX_LENGTH = 1000 as const;
