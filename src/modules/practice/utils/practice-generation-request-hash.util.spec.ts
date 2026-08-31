import { computePracticeGenerationRequestHash } from './practice-generation-request-hash.util';
import type { NormalizedPracticeGenerationRequest } from '../interfaces/practice.interface';
import { QuestionType } from '../../question-bank/enums/question-type.enum';
import { shuffleCopy, type ShuffleRandomSource } from './practice-shuffle.util';

describe('practice generation helpers', () => {
  it('computes stable hashes for equivalent normalized payloads', () => {
    const request: NormalizedPracticeGenerationRequest = {
      locale: 'vi-VN',
      curriculumId: null,
      canonicalLessonKey: null,
      tagIds: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
      tagCodes: ['sacraments'],
      questionTypes: [QuestionType.SingleChoice],
      difficulty: null,
      questionCount: 5,
      randomizeQuestions: true,
      randomizeOptions: true,
    };

    const hashA = computePracticeGenerationRequestHash(
      request,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    const hashB = computePracticeGenerationRequestHash(
      {
        ...request,
        tagIds: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
      },
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);
  });

  it('shuffles deterministically when random source is fixed', () => {
    const random: ShuffleRandomSource = {
      next: () => 0,
    };

    const first = shuffleCopy(['a', 'b', 'c', 'd'], random);
    const second = shuffleCopy(['a', 'b', 'c', 'd'], random);

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
  });
});
