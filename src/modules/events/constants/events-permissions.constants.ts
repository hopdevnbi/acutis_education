export const EVENTS_READ_PERMISSION = 'events.read' as const;
export const EVENTS_MANAGE_PERMISSION = 'events.manage' as const;
export const EVENTS_REGISTER_PERMISSION = 'events.register' as const;
export const EVENTS_CHECKIN_PERMISSION = 'events.checkin' as const;

export const EVENTS_PERMISSIONS = [
  EVENTS_READ_PERMISSION,
  EVENTS_MANAGE_PERMISSION,
  EVENTS_REGISTER_PERMISSION,
  EVENTS_CHECKIN_PERMISSION,
] as const;

export const EVENT_CODE_MAX_LENGTH = 64 as const;
export const EVENT_TITLE_MAX_LENGTH = 200 as const;
export const EVENT_SUMMARY_MAX_LENGTH = 1000 as const;
