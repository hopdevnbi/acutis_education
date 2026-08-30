import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  ContentBlockLimitExceededError,
  ContentDocumentTooLargeError,
  InvalidContentAssetIdError,
  InvalidContentDocumentError,
} from '../errors/learning-content.errors';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  MAX_CONTENT_BLOCKS,
  MAX_CONTENT_DOCUMENT_BYTES,
  type BulletListBlock,
  type CalloutBlock,
  type CalloutVariant,
  type ContentBlock,
  type ContentBlockType,
  type ContentDocumentV1,
  type HeadingBlock,
  type ImageRefBlock,
  type NumberedListBlock,
  type ParagraphBlock,
  type ScriptureRefBlock,
  type VideoRefBlock,
} from '../interfaces/learning-content.interface';

const CONTENT_BLOCK_TYPES: readonly ContentBlockType[] = [
  'heading',
  'paragraph',
  'bullet_list',
  'numbered_list',
  'scripture_ref',
  'callout',
  'image_ref',
  'video_ref',
] as const;

const CALLOUT_VARIANTS: readonly CalloutVariant[] = ['info', 'tip', 'important'] as const;

const HTML_TAG_PATTERN = /<[a-z!/][^>]*>/i;
const SCRIPT_URL_PATTERN = /(?:javascript|vbscript|data:text\/html):/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertPlainObject(value: unknown, context: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new InvalidContentDocumentError(`${context} must be an object.`);
  }

  return value;
}

function assertOnlyKnownKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) {
      throw new InvalidContentDocumentError(`Unknown field "${key}" in ${context}.`);
    }
  }
}

function parseTrimmedNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new InvalidContentDocumentError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new InvalidContentDocumentError(`${fieldName} must not be empty.`);
  }

  assertNoHtmlOrScript(trimmed, fieldName);

  return trimmed;
}

function parseOptionalTrimmedString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new InvalidContentDocumentError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  assertNoHtmlOrScript(trimmed, fieldName);

  return trimmed;
}

function assertNoHtmlOrScript(value: string, fieldName: string): void {
  if (HTML_TAG_PATTERN.test(value)) {
    throw new InvalidContentDocumentError(`${fieldName} must not contain HTML markup.`);
  }

  if (SCRIPT_URL_PATTERN.test(value)) {
    throw new InvalidContentDocumentError(`${fieldName} must not contain script URLs.`);
  }
}

function parseAssetId(value: unknown): string {
  if (typeof value !== 'string' || !isUuidV4(value)) {
    throw new InvalidContentAssetIdError();
  }

  return normalizeUuid(value);
}

function parseListItems(value: unknown, fieldName: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new InvalidContentDocumentError(`${fieldName} must be an array.`);
  }

  if (value.length === 0) {
    throw new InvalidContentDocumentError(`${fieldName} must contain at least one item.`);
  }

  return value.map((item, index) => parseTrimmedNonEmptyString(item, `${fieldName}[${index}]`));
}

function parseHeadingBlock(record: Record<string, unknown>): HeadingBlock {
  assertOnlyKnownKeys(record, ['type', 'level', 'text'], 'heading block');

  const level = record['level'];

  if (level !== 1 && level !== 2 && level !== 3) {
    throw new InvalidContentDocumentError('heading block level must be 1, 2, or 3.');
  }

  return {
    type: 'heading',
    level,
    text: parseTrimmedNonEmptyString(record['text'], 'heading.text'),
  };
}

function parseParagraphBlock(record: Record<string, unknown>): ParagraphBlock {
  assertOnlyKnownKeys(record, ['type', 'text'], 'paragraph block');

  return {
    type: 'paragraph',
    text: parseTrimmedNonEmptyString(record['text'], 'paragraph.text'),
  };
}

function parseBulletListBlock(record: Record<string, unknown>): BulletListBlock {
  assertOnlyKnownKeys(record, ['type', 'items'], 'bullet_list block');

  return {
    type: 'bullet_list',
    items: parseListItems(record['items'], 'bullet_list.items'),
  };
}

function parseNumberedListBlock(record: Record<string, unknown>): NumberedListBlock {
  assertOnlyKnownKeys(record, ['type', 'items'], 'numbered_list block');

  return {
    type: 'numbered_list',
    items: parseListItems(record['items'], 'numbered_list.items'),
  };
}

function parseScriptureRefBlock(record: Record<string, unknown>): ScriptureRefBlock {
  assertOnlyKnownKeys(record, ['type', 'reference', 'text'], 'scripture_ref block');

  const text = parseOptionalTrimmedString(record['text'], 'scripture_ref.text');

  return {
    type: 'scripture_ref',
    reference: parseTrimmedNonEmptyString(record['reference'], 'scripture_ref.reference'),
    ...(text === undefined ? {} : { text }),
  };
}

function parseCalloutBlock(record: Record<string, unknown>): CalloutBlock {
  assertOnlyKnownKeys(record, ['type', 'variant', 'text'], 'callout block');

  const variant = record['variant'];

  if (typeof variant !== 'string' || !CALLOUT_VARIANTS.includes(variant as CalloutVariant)) {
    throw new InvalidContentDocumentError('callout block variant must be info, tip, or important.');
  }

  return {
    type: 'callout',
    variant: variant as CalloutVariant,
    text: parseTrimmedNonEmptyString(record['text'], 'callout.text'),
  };
}

function parseImageRefBlock(record: Record<string, unknown>): ImageRefBlock {
  assertOnlyKnownKeys(record, ['type', 'assetId', 'alt', 'caption'], 'image_ref block');

  const alt = parseOptionalTrimmedString(record['alt'], 'image_ref.alt');
  const caption = parseOptionalTrimmedString(record['caption'], 'image_ref.caption');

  return {
    type: 'image_ref',
    assetId: parseAssetId(record['assetId']),
    ...(alt === undefined ? {} : { alt }),
    ...(caption === undefined ? {} : { caption }),
  };
}

function parseVideoRefBlock(record: Record<string, unknown>): VideoRefBlock {
  assertOnlyKnownKeys(record, ['type', 'assetId', 'caption'], 'video_ref block');

  const caption = parseOptionalTrimmedString(record['caption'], 'video_ref.caption');

  return {
    type: 'video_ref',
    assetId: parseAssetId(record['assetId']),
    ...(caption === undefined ? {} : { caption }),
  };
}

function parseContentBlock(value: unknown, index: number): ContentBlock {
  const record = assertPlainObject(value, `blocks[${index}]`);
  const blockType = record['type'];

  if (
    typeof blockType !== 'string' ||
    !CONTENT_BLOCK_TYPES.includes(blockType as ContentBlockType)
  ) {
    throw new InvalidContentDocumentError(`blocks[${index}] has an unknown block type.`);
  }

  switch (blockType) {
    case 'heading':
      return parseHeadingBlock(record);
    case 'paragraph':
      return parseParagraphBlock(record);
    case 'bullet_list':
      return parseBulletListBlock(record);
    case 'numbered_list':
      return parseNumberedListBlock(record);
    case 'scripture_ref':
      return parseScriptureRefBlock(record);
    case 'callout':
      return parseCalloutBlock(record);
    case 'image_ref':
      return parseImageRefBlock(record);
    case 'video_ref':
      return parseVideoRefBlock(record);
    default:
      throw new InvalidContentDocumentError(`blocks[${index}] has an unknown block type.`);
  }
}

export function validateContentDocumentV1(input: unknown): ContentDocumentV1 {
  const record = assertPlainObject(input, 'document');
  assertOnlyKnownKeys(record, ['schemaVersion', 'blocks'], 'document');

  if (record['schemaVersion'] !== CONTENT_DOCUMENT_SCHEMA_VERSION) {
    throw new InvalidContentDocumentError('document schemaVersion must be 1.');
  }

  const blocksInput = record['blocks'];

  if (!Array.isArray(blocksInput)) {
    throw new InvalidContentDocumentError('document blocks must be an array.');
  }

  if (blocksInput.length > MAX_CONTENT_BLOCKS) {
    throw new ContentBlockLimitExceededError();
  }

  const blocks = blocksInput.map((block, index) => parseContentBlock(block, index));
  const document: ContentDocumentV1 = {
    schemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
    blocks,
  };

  const serializedLength = Buffer.byteLength(JSON.stringify(document), 'utf8');

  if (serializedLength > MAX_CONTENT_DOCUMENT_BYTES) {
    throw new ContentDocumentTooLargeError();
  }

  return document;
}

export function isNonEmptyContentDocument(document: ContentDocumentV1): boolean {
  return document.blocks.length > 0;
}
