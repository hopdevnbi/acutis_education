import type {
  CreateQuestionResponse,
  CreateQuestionResult,
  ListQuestionTagsResult,
  ListQuestionsResult,
  QuestionAuthoringResponse,
  QuestionAuthoringSnapshot,
  QuestionCurriculumLinkListResponse,
  QuestionCurriculumLinkResponse,
  QuestionCurriculumLinkSnapshot,
  QuestionListResponse,
  QuestionOptionListResponse,
  QuestionOptionResponse,
  QuestionOptionSnapshot,
  QuestionResponse,
  QuestionSnapshot,
  QuestionTagLinkResponse,
  QuestionTagLinkSnapshot,
  QuestionTagListResponse,
  QuestionTagResponse,
  QuestionTagSnapshot,
  QuestionVersionListResponse,
  QuestionVersionResponse,
  QuestionVersionSnapshot,
} from '../interfaces/question-bank.interface';

export function toQuestionResponse(snapshot: QuestionSnapshot): QuestionResponse {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    code: snapshot.code,
    status: snapshot.status,
    sourceLocale: snapshot.sourceLocale,
    currentPublishedVersionId: snapshot.currentPublishedVersionId,
    createdByUserId: snapshot.createdByUserId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toQuestionListResponse(result: ListQuestionsResult): QuestionListResponse {
  return {
    items: result.items.map(toQuestionResponse),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toQuestionVersionResponse(
  snapshot: QuestionVersionSnapshot,
): QuestionVersionResponse {
  return {
    id: snapshot.id,
    questionId: snapshot.questionId,
    versionNumber: snapshot.versionNumber,
    status: snapshot.status,
    questionType: snapshot.questionType,
    prompt: snapshot.prompt,
    instruction: snapshot.instruction,
    explanation: snapshot.explanation,
    promptMediaJson: snapshot.promptMediaJson,
    explanationMediaJson: snapshot.explanationMediaJson,
    answerDefinitionJson: snapshot.answerDefinitionJson,
    difficulty: snapshot.difficulty,
    sourceContentHash: snapshot.sourceContentHash,
    createdByUserId: snapshot.createdByUserId,
    publishedByUserId: snapshot.publishedByUserId,
    publishedAt: snapshot.publishedAt?.toISOString() ?? null,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toQuestionVersionListResponse(
  snapshots: QuestionVersionSnapshot[],
): QuestionVersionListResponse {
  return {
    items: snapshots.map(toQuestionVersionResponse),
  };
}

export function toCreateQuestionResponse(result: CreateQuestionResult): CreateQuestionResponse {
  return {
    question: toQuestionResponse(result.question),
    initialVersion: toQuestionVersionResponse(result.initialVersion),
  };
}

export function toQuestionTagResponse(snapshot: QuestionTagSnapshot): QuestionTagResponse {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    code: snapshot.code,
    name: snapshot.name,
    status: snapshot.status,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toQuestionTagListResponse(result: ListQuestionTagsResult): QuestionTagListResponse {
  return {
    items: result.items.map(toQuestionTagResponse),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toQuestionTagLinkResponse(
  snapshot: QuestionTagLinkSnapshot,
): QuestionTagLinkResponse {
  return {
    questionId: snapshot.questionId,
    tagId: snapshot.tagId,
  };
}

export function toQuestionCurriculumLinkResponse(
  snapshot: QuestionCurriculumLinkSnapshot,
): QuestionCurriculumLinkResponse {
  return {
    id: snapshot.id,
    questionId: snapshot.questionId,
    parishId: snapshot.parishId,
    curriculumId: snapshot.curriculumId,
    canonicalLessonKey: snapshot.canonicalLessonKey,
    authoringCurriculumVersionId: snapshot.authoringCurriculumVersionId,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

export function toQuestionCurriculumLinkListResponse(
  snapshots: QuestionCurriculumLinkSnapshot[],
): QuestionCurriculumLinkListResponse {
  return {
    items: snapshots.map(toQuestionCurriculumLinkResponse),
  };
}

export function toQuestionOptionResponse(snapshot: QuestionOptionSnapshot): QuestionOptionResponse {
  return {
    id: snapshot.id,
    questionVersionId: snapshot.questionVersionId,
    code: snapshot.code,
    text: snapshot.text,
    mediaAssetId: snapshot.mediaAssetId,
    sortOrder: snapshot.sortOrder,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toQuestionOptionListResponse(
  snapshots: QuestionOptionSnapshot[],
): QuestionOptionListResponse {
  return {
    items: snapshots.map(toQuestionOptionResponse),
  };
}

export function toQuestionAuthoringResponse(
  snapshot: QuestionAuthoringSnapshot,
): QuestionAuthoringResponse {
  return {
    version: toQuestionVersionResponse(snapshot.version),
    options: snapshot.options.map(toQuestionOptionResponse),
    correctOptionIds: [...snapshot.correctOptionIds],
  };
}
