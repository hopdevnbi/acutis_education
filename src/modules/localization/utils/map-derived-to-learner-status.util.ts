import { DerivedTranslationReadStatus } from '../enums/translation-revision-status.enum';
import { LearnerTranslationReadStatus } from '../enums/learner-translation-read-status.enum';

export function mapDerivedToLearnerTranslationReadStatus(
  derivedStatus: DerivedTranslationReadStatus,
): LearnerTranslationReadStatus {
  switch (derivedStatus) {
    case DerivedTranslationReadStatus.Source:
      return LearnerTranslationReadStatus.Source;
    case DerivedTranslationReadStatus.Approved:
      return LearnerTranslationReadStatus.Approved;
    case DerivedTranslationReadStatus.Missing:
      return LearnerTranslationReadStatus.Missing;
    case DerivedTranslationReadStatus.Stale:
      return LearnerTranslationReadStatus.Stale;
    case DerivedTranslationReadStatus.MachineTranslated:
      return LearnerTranslationReadStatus.Missing;
    default: {
      const exhaustiveCheck: never = derivedStatus;
      throw new Error(`Unsupported derived translation status: ${String(exhaustiveCheck)}`);
    }
  }
}
