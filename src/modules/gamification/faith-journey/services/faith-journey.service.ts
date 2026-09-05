import type { FaithJourneySnapshot } from '../interfaces/gamification.interfaces';

/**
 * Faith Journey is a composed read capability (#005+).
 * Placeholder service shell for module structure completeness in #002.
 */
export class FaithJourneyService {
  async buildPlaceholder(input: {
    readonly studentId: string;
    readonly enrollmentId?: string | null;
  }): Promise<FaithJourneySnapshot> {
    return {
      studentId: input.studentId,
      enrollmentId: input.enrollmentId ?? null,
      generatedAt: new Date(),
      items: [],
    };
  }
}
