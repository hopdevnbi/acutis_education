export const CONTENT_DOCUMENT_SCHEMA_VERSION = 1 as const;

export const MAX_CONTENT_BLOCKS = 500;
export const MAX_CONTENT_DOCUMENT_BYTES = 256 * 1024;

export type ContentBlockType =
  | 'heading'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'scripture_ref'
  | 'callout'
  | 'image_ref'
  | 'video_ref';

export type CalloutVariant = 'info' | 'tip' | 'important';

export interface HeadingBlock {
  readonly type: 'heading';
  readonly level: 1 | 2 | 3;
  readonly text: string;
}

export interface ParagraphBlock {
  readonly type: 'paragraph';
  readonly text: string;
}

export interface BulletListBlock {
  readonly type: 'bullet_list';
  readonly items: readonly string[];
}

export interface NumberedListBlock {
  readonly type: 'numbered_list';
  readonly items: readonly string[];
}

export interface ScriptureRefBlock {
  readonly type: 'scripture_ref';
  readonly reference: string;
  readonly text?: string;
}

export interface CalloutBlock {
  readonly type: 'callout';
  readonly variant: CalloutVariant;
  readonly text: string;
}

export interface ImageRefBlock {
  readonly type: 'image_ref';
  readonly assetId: string;
  readonly alt?: string;
  readonly caption?: string;
}

export interface VideoRefBlock {
  readonly type: 'video_ref';
  readonly assetId: string;
  readonly caption?: string;
}

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | BulletListBlock
  | NumberedListBlock
  | ScriptureRefBlock
  | CalloutBlock
  | ImageRefBlock
  | VideoRefBlock;

export interface ContentDocumentV1 {
  readonly schemaVersion: typeof CONTENT_DOCUMENT_SCHEMA_VERSION;
  readonly blocks: readonly ContentBlock[];
}

export interface LearningContentSnapshot {
  readonly id: string;
  readonly lessonId: string;
  readonly contentSchemaVersion: number;
  readonly document: ContentDocumentV1;
  readonly contentHash: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpsertLessonContentInput {
  readonly document: ContentDocumentV1;
}

export interface ContentPublishValidationIssue {
  readonly lessonId: string;
  readonly lessonTitle: string;
  readonly code: 'CONTENT_MISSING' | 'CONTENT_EMPTY';
  readonly message: string;
}
