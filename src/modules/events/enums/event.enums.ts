export enum EventStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Archived = 'ARCHIVED',
}

export enum EventScopeType {
  Global = 'GLOBAL',
  Parish = 'PARISH',
  Class = 'CLASS',
}

export enum EventRegistrationStatus {
  Registered = 'REGISTERED',
  Cancelled = 'CANCELLED',
  Attended = 'ATTENDED',
  NoShow = 'NO_SHOW',
}

export enum CommunicationTargetType {
  Global = 'GLOBAL',
  Parish = 'PARISH',
  Class = 'CLASS',
  Role = 'ROLE',
}
