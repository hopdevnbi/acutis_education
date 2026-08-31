import type { QuestionDifficulty } from '../enums/question-difficulty.enum';
import type { QuestionStatus } from '../enums/question-status.enum';
import type { QuestionTagStatus } from '../enums/question-tag-status.enum';
import type { QuestionType } from '../enums/question-type.enum';
import type { QuestionVersionStatus } from '../enums/question-version-status.enum';
import type {
  QUESTION_SORT_DIRECTIONS,
  QUESTION_SORT_FIELDS,
  QUESTION_TAG_SORT_DIRECTIONS,
  QUESTION_TAG_SORT_FIELDS,
} from '../constants/question-list.constants';

export interface QuestionSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly code: string | null;
  readonly status: QuestionStatus;
  readonly sourceLocale: string;
  readonly currentPublishedVersionId: string | null;
  readonly createdByUserId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QuestionVersionSnapshot {
  readonly id: string;
  readonly questionId: string;
  readonly versionNumber: number;
  readonly status: QuestionVersionStatus;
  readonly questionType: QuestionType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly promptMediaJson: string | null;
  readonly explanationMediaJson: string | null;
  readonly answerDefinitionJson: string | null;
  readonly difficulty: QuestionDifficulty | null;
  readonly sourceContentHash: string | null;
  readonly createdByUserId: string | null;
  readonly publishedByUserId: string | null;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QuestionOptionSnapshot {
  readonly id: string;
  readonly questionVersionId: string;
  readonly code: string | null;
  readonly text: string | null;
  readonly mediaAssetId: string | null;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QuestionAuthoringSnapshot {
  readonly version: QuestionVersionSnapshot;
  readonly options: QuestionOptionSnapshot[];
  readonly correctOptionIds: string[];
}

export interface QuestionTagSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly code: string;
  readonly name: string;
  readonly status: QuestionTagStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface QuestionTagLinkSnapshot {
  readonly questionId: string;
  readonly tagId: string;
}

export interface QuestionCurriculumLinkSnapshot {
  readonly id: string;
  readonly questionId: string;
  readonly parishId: string;
  readonly curriculumId: string;
  readonly canonicalLessonKey: string | null;
  readonly authoringCurriculumVersionId: string | null;
  readonly createdAt: Date;
}

export interface CreateQuestionDraftInput {
  readonly questionType: QuestionType;
  readonly prompt?: string;
  readonly instruction?: string | null;
  readonly explanation?: string | null;
  readonly difficulty?: QuestionDifficulty | null;
}

export interface CreateQuestionInput {
  readonly code?: string | null;
  readonly sourceLocale: string;
  readonly createdByUserId: string;
  readonly draft: CreateQuestionDraftInput;
}

export interface CreateQuestionResult {
  readonly question: QuestionSnapshot;
  readonly initialVersion: QuestionVersionSnapshot;
}

export interface UpdateQuestionInput {
  readonly code?: string | null;
  readonly sourceLocale?: string;
}

export interface ListQuestionsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: (typeof QUESTION_SORT_FIELDS)[number];
  readonly sort: (typeof QUESTION_SORT_DIRECTIONS)[number];
  readonly status?: QuestionStatus;
  readonly sourceLocale?: string;
  readonly search?: string;
}

export interface ListQuestionsResult {
  readonly items: QuestionSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CreateQuestionVersionInput {
  readonly createdByUserId: string;
  readonly questionType: QuestionType;
  readonly prompt?: string;
  readonly instruction?: string | null;
  readonly explanation?: string | null;
  readonly difficulty?: QuestionDifficulty | null;
}

export interface ListQuestionVersionsInput {
  readonly status?: QuestionVersionStatus;
}

export interface UpdateQuestionVersionInput {
  readonly questionType?: QuestionType;
  readonly prompt?: string;
  readonly instruction?: string | null;
  readonly explanation?: string | null;
  readonly difficulty?: QuestionDifficulty | null;
  readonly promptMediaJson?: string | null;
  readonly explanationMediaJson?: string | null;
}

export interface ReplaceQuestionOptionInput {
  readonly code?: string | null;
  readonly text?: string | null;
  readonly mediaAssetId?: string | null;
  readonly sortOrder: number;
}

export interface SetCorrectOptionsInput {
  readonly optionIds: readonly string[];
}

export interface CreateQuestionTagInput {
  readonly code: string;
  readonly name: string;
}

export interface UpdateQuestionTagInput {
  readonly code?: string;
  readonly name?: string;
}

export interface ListQuestionTagsInput {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: (typeof QUESTION_TAG_SORT_FIELDS)[number];
  readonly sort: (typeof QUESTION_TAG_SORT_DIRECTIONS)[number];
  readonly status?: QuestionTagStatus;
  readonly search?: string;
}

export interface ListQuestionTagsResult {
  readonly items: QuestionTagSnapshot[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface CreateQuestionCurriculumLinkInput {
  readonly curriculumId: string;
  readonly canonicalLessonKey?: string | null;
  readonly authoringCurriculumVersionId?: string | null;
}

export interface QuestionResponse {
  readonly id: string;
  readonly parishId: string;
  readonly code: string | null;
  readonly status: QuestionStatus;
  readonly sourceLocale: string;
  readonly currentPublishedVersionId: string | null;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuestionVersionResponse {
  readonly id: string;
  readonly questionId: string;
  readonly versionNumber: number;
  readonly status: QuestionVersionStatus;
  readonly questionType: QuestionType;
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly promptMediaJson: string | null;
  readonly explanationMediaJson: string | null;
  readonly answerDefinitionJson: string | null;
  readonly difficulty: QuestionDifficulty | null;
  readonly sourceContentHash: string | null;
  readonly createdByUserId: string | null;
  readonly publishedByUserId: string | null;
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuestionListResponse {
  readonly items: QuestionResponse[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface QuestionVersionListResponse {
  readonly items: QuestionVersionResponse[];
}

export interface CreateQuestionResponse {
  readonly question: QuestionResponse;
  readonly initialVersion: QuestionVersionResponse;
}

export interface QuestionTagResponse {
  readonly id: string;
  readonly parishId: string;
  readonly code: string;
  readonly name: string;
  readonly status: QuestionTagStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuestionTagListResponse {
  readonly items: QuestionTagResponse[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface QuestionTagLinkResponse {
  readonly questionId: string;
  readonly tagId: string;
}

export interface QuestionCurriculumLinkResponse {
  readonly id: string;
  readonly questionId: string;
  readonly parishId: string;
  readonly curriculumId: string;
  readonly canonicalLessonKey: string | null;
  readonly authoringCurriculumVersionId: string | null;
  readonly createdAt: string;
}

export interface QuestionCurriculumLinkListResponse {
  readonly items: QuestionCurriculumLinkResponse[];
}

export interface QuestionOptionResponse {
  readonly id: string;
  readonly questionVersionId: string;
  readonly code: string | null;
  readonly text: string | null;
  readonly mediaAssetId: string | null;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuestionOptionListResponse {
  readonly items: QuestionOptionResponse[];
}

export interface QuestionAuthoringResponse {
  readonly version: QuestionVersionResponse;
  readonly options: QuestionOptionResponse[];
  readonly correctOptionIds: string[];
}
