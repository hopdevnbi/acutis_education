import { createHash } from 'node:crypto';
import type { QuestionOptionSnapshot } from '../interfaces/question-bank.interface';
import { canonicalizeJson } from './canonical-json.util';
import { parseQuestionMediaJsonDocument } from './question-media-json.util';

export interface QuestionSourceContentHashInput {
  readonly prompt: string;
  readonly instruction: string | null;
  readonly explanation: string | null;
  readonly promptMediaJson: string | null;
  readonly explanationMediaJson: string | null;
  readonly options: readonly QuestionOptionSnapshot[];
}

function normalizeMediaJsonForHash(rawMediaJson: string | null): unknown {
  if (rawMediaJson === null || rawMediaJson.trim().length === 0) {
    return null;
  }

  return parseQuestionMediaJsonDocument(rawMediaJson);
}

export function computeQuestionSourceContentHash(input: QuestionSourceContentHashInput): string {
  const payload = {
    prompt: input.prompt,
    instruction: input.instruction,
    explanation: input.explanation,
    promptMediaJson: normalizeMediaJsonForHash(input.promptMediaJson),
    explanationMediaJson: normalizeMediaJsonForHash(input.explanationMediaJson),
    options: [...input.options]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((option) => ({
        code: option.code,
        text: option.text,
        mediaAssetId: option.mediaAssetId,
        sortOrder: option.sortOrder,
      })),
  };

  return createHash('sha256').update(canonicalizeJson(payload)).digest('hex').toLowerCase();
}
