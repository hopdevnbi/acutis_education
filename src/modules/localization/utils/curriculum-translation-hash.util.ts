import { createHash } from 'node:crypto';
import { canonicalizeJson } from './canonical-json.util';

export function computeCurriculumMetadataContentHash(input: {
  readonly name: string;
  readonly description: string | null;
}): string {
  return createHash('sha256')
    .update(
      canonicalizeJson({
        name: input.name,
        description: input.description,
      }),
    )
    .digest('hex')
    .toLowerCase();
}

export function computeCurriculumVersionContentHash(input: {
  readonly label: string | null;
}): string {
  return createHash('sha256')
    .update(
      canonicalizeJson({
        label: input.label,
      }),
    )
    .digest('hex')
    .toLowerCase();
}

export function computeCurriculumTopicContentHash(input: {
  readonly title: string;
  readonly description: string | null;
}): string {
  return createHash('sha256')
    .update(
      canonicalizeJson({
        title: input.title,
        description: input.description,
      }),
    )
    .digest('hex')
    .toLowerCase();
}

export function computeCurriculumLessonContentHash(input: {
  readonly title: string;
  readonly summary: string | null;
}): string {
  return createHash('sha256')
    .update(
      canonicalizeJson({
        title: input.title,
        summary: input.summary,
      }),
    )
    .digest('hex')
    .toLowerCase();
}
