import { createHash } from 'node:crypto';
import type { ContentDocumentV1 } from '../interfaces/learning-content.interface';
import { canonicalizeJson } from './canonical-json.util';

export function computeContentHash(document: ContentDocumentV1): string {
  const payload = {
    schemaVersion: document.schemaVersion,
    blocks: document.blocks,
  };

  return createHash('sha256').update(canonicalizeJson(payload)).digest('hex').toLowerCase();
}
