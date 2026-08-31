import { isUuidV4 } from '../database/uuid-v4.util';
import { QuestionCurriculumLinkEntity } from '../modules/question-bank/entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from '../modules/question-bank/entities/question-option.entity';
import { QuestionTagEntity } from '../modules/question-bank/entities/question-tag.entity';
import { QuestionVersionEntity } from '../modules/question-bank/entities/question-version.entity';
import { QuestionEntity } from '../modules/question-bank/entities/question.entity';
import { QuestionDifficulty } from '../modules/question-bank/enums/question-difficulty.enum';
import { QuestionStatus } from '../modules/question-bank/enums/question-status.enum';
import { QuestionTagStatus } from '../modules/question-bank/enums/question-tag-status.enum';
import { QuestionType } from '../modules/question-bank/enums/question-type.enum';
import { QuestionVersionStatus } from '../modules/question-bank/enums/question-version-status.enum';

describe('Question bank entity UUID generation', () => {
  it.each([
    ['QuestionEntity', () => new QuestionEntity()],
    ['QuestionVersionEntity', () => new QuestionVersionEntity()],
    ['QuestionOptionEntity', () => new QuestionOptionEntity()],
    ['QuestionTagEntity', () => new QuestionTagEntity()],
    ['QuestionCurriculumLinkEntity', () => new QuestionCurriculumLinkEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when QuestionEntity is constructed with explicit values', () => {
    const explicitId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const question = new QuestionEntity();
    question.id = explicitId;
    question.parishId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    question.code = 'q-sacraments-01';
    question.status = QuestionStatus.Active;
    question.sourceLocale = 'vi-VN';
    question.currentPublishedVersionId = null;
    question.createdByUserId = null;

    expect(question.id).toBe(explicitId);
  });

  it('allows scalar foreign key assignment without relations on QuestionVersionEntity', () => {
    const version = new QuestionVersionEntity();
    version.questionId = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    version.versionNumber = 1;
    version.status = QuestionVersionStatus.Draft;
    version.questionType = QuestionType.SingleChoice;
    version.prompt = 'Câu hỏi mẫu';
    version.instruction = null;
    version.explanation = null;
    version.promptMediaJson = null;
    version.explanationMediaJson = null;
    version.answerDefinitionJson = null;
    version.difficulty = QuestionDifficulty.Easy;
    version.sourceContentHash = null;
    version.publishedAt = null;
    version.publishedByUserId = null;
    version.createdByUserId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

    expect(version.status).toBe(QuestionVersionStatus.Draft);
    expect(version.publishedAt).toBeNull();
  });

  it('allows QuestionOptionEntity scalar mediaAssetId without relations', () => {
    const option = new QuestionOptionEntity();
    option.questionVersionId = 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    option.code = 'true';
    option.text = 'Đúng';
    option.mediaAssetId = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
    option.sortOrder = 0;

    expect(option.mediaAssetId).toBe('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66');
  });

  it('allows QuestionTagEntity with explicit id preservation', () => {
    const explicitId = 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
    const tag = new QuestionTagEntity();
    tag.id = explicitId;
    tag.parishId = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';
    tag.code = 'sacraments';
    tag.name = 'Bí tích';
    tag.status = QuestionTagStatus.Active;

    expect(tag.id).toBe(explicitId);
  });
});
