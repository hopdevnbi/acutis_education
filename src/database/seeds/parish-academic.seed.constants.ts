import { normalizeIsoDateOnly } from '../iso-date-only-column.transformer';

export const PARISH_ACADEMIC_SAMPLE_PARISH_CODE = 'demo-parish' as const;
export const PARISH_ACADEMIC_SAMPLE_PARISH_NAME = 'Giáo xứ Demo (Local Sample)' as const;

export const PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_NAME = '2026-2027 (Demo)' as const;
export const PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_START_DATE = '2026-09-01' as const;
export const PARISH_ACADEMIC_SAMPLE_ACADEMIC_YEAR_END_DATE = '2027-06-30' as const;

export interface ParishAcademicSeedLevelDefinition {
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
}

export const PARISH_ACADEMIC_SEED_LEVELS: readonly ParishAcademicSeedLevelDefinition[] = [
  {
    code: 'demo-level-1',
    name: 'Cấp Demo 1',
    sortOrder: 1,
  },
  {
    code: 'demo-level-2',
    name: 'Cấp Demo 2',
    sortOrder: 2,
  },
  {
    code: 'demo-level-3',
    name: 'Cấp Demo 3',
    sortOrder: 3,
  },
] as const;

export function assertParishAcademicSampleDateContract(value: string): string {
  return normalizeIsoDateOnly(value);
}
