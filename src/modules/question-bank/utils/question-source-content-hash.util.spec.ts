import { generateUuidV4 } from '../../../database/uuid-v4.util';
import type { QuestionOptionSnapshot } from '../interfaces/question-bank.interface';
import { computeQuestionSourceContentHash } from './question-source-content-hash.util';

function buildOption(
  overrides: Partial<QuestionOptionSnapshot> & Pick<QuestionOptionSnapshot, 'sortOrder'>,
): QuestionOptionSnapshot {
  return {
    id: generateUuidV4(),
    questionVersionId: generateUuidV4(),
    code: overrides.code ?? 'a',
    text: overrides.text ?? 'Option text',
    mediaAssetId: overrides.mediaAssetId ?? null,
    sortOrder: overrides.sortOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('computeQuestionSourceContentHash', () => {
  const baseInput = {
    prompt: 'What is baptism?',
    instruction: 'Choose one answer.',
    explanation: 'Baptism initiates Christian life.',
    promptMediaJson: null,
    explanationMediaJson: null,
    options: [
      buildOption({ code: 'a', text: 'Baptism', sortOrder: 1 }),
      buildOption({ code: 'b', text: 'Confirmation', sortOrder: 2 }),
    ],
  };

  it('produces identical hash when only option UUIDs differ', () => {
    const firstHash = computeQuestionSourceContentHash(baseInput);
    const secondHash = computeQuestionSourceContentHash({
      ...baseInput,
      options: [
        buildOption({ code: 'a', text: 'Baptism', sortOrder: 1 }),
        buildOption({ code: 'b', text: 'Confirmation', sortOrder: 2 }),
      ],
    });

    expect(firstHash).toBe(secondHash);
  });

  it('changes hash when prompt text changes', () => {
    const originalHash = computeQuestionSourceContentHash(baseInput);
    const changedHash = computeQuestionSourceContentHash({
      ...baseInput,
      prompt: 'What is confirmation?',
    });

    expect(changedHash).not.toBe(originalHash);
  });

  it('changes hash when option text changes', () => {
    const originalHash = computeQuestionSourceContentHash(baseInput);
    const changedHash = computeQuestionSourceContentHash({
      ...baseInput,
      options: [
        buildOption({ code: 'a', text: 'Baptism updated', sortOrder: 1 }),
        buildOption({ code: 'b', text: 'Confirmation', sortOrder: 2 }),
      ],
    });

    expect(changedHash).not.toBe(originalHash);
  });

  it('excludes option row id from hash semantics', () => {
    const optionA = buildOption({ code: 'a', text: 'Baptism', sortOrder: 1 });
    const optionB = buildOption({ code: 'b', text: 'Confirmation', sortOrder: 2 });

    const hashWithIds = computeQuestionSourceContentHash({
      ...baseInput,
      options: [optionA, optionB],
    });

    const hashWithDifferentIds = computeQuestionSourceContentHash({
      ...baseInput,
      options: [
        { ...optionA, id: generateUuidV4() },
        { ...optionB, id: generateUuidV4() },
      ],
    });

    expect(hashWithDifferentIds).toBe(hashWithIds);
  });

  it('does not change hash when only correct-answer mappings would differ', () => {
    const hash = computeQuestionSourceContentHash(baseInput);

    expect(hash).toBe(computeQuestionSourceContentHash(baseInput));
  });
});
