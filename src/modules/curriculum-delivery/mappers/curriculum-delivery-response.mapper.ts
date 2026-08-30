import type {
  LearnerCurriculumTree,
  LearnerLessonContent,
} from '../interfaces/curriculum-delivery.interface';
import type {
  LearnerCurriculumTreeResponseDto,
  LearnerLessonContentResponseDto,
} from '../dto/learner-curriculum-delivery-response.dto';

export function toLearnerCurriculumTreeResponseDto(
  tree: LearnerCurriculumTree,
): LearnerCurriculumTreeResponseDto {
  return {
    curriculum: { ...tree.curriculum },
    version: { ...tree.version },
    topics: tree.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sortOrder,
      lessons: topic.lessons.map((lesson) => ({ ...lesson })),
    })),
  };
}

export function toLearnerLessonContentResponseDto(
  content: LearnerLessonContent,
): LearnerLessonContentResponseDto {
  return { ...content };
}

export function parseRequestedLocale(rawAcceptLanguage: string | undefined): string | null {
  if (rawAcceptLanguage === undefined || rawAcceptLanguage.trim().length === 0) {
    return null;
  }

  const firstTag = rawAcceptLanguage.split(',')[0]?.trim();

  if (firstTag === undefined || firstTag.length === 0) {
    return null;
  }

  return firstTag;
}
