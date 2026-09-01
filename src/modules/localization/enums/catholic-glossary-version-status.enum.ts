export enum CatholicGlossaryVersionStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Archived = 'ARCHIVED',
}

const CATHOLIC_GLOSSARY_VERSION_STATUSES = new Set<string>(
  Object.values(CatholicGlossaryVersionStatus),
);

export function isCatholicGlossaryVersionStatus(
  value: string,
): value is CatholicGlossaryVersionStatus {
  return CATHOLIC_GLOSSARY_VERSION_STATUSES.has(value);
}
