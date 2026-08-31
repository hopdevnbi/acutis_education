import type {
  ContentBlock,
  ContentDocumentV1,
  ImageRefBlock,
  VideoRefBlock,
} from '../../learning-content/interfaces/learning-content.interface';

export type LearnerDeliveryImageRefBlock = ImageRefBlock & {
  readonly mediaContentPath: string;
};

export type LearnerDeliveryVideoRefBlock = VideoRefBlock & {
  readonly mediaContentPath: string;
};

export type LearnerDeliveryContentBlock =
  | Exclude<ContentBlock, ImageRefBlock | VideoRefBlock>
  | LearnerDeliveryImageRefBlock
  | LearnerDeliveryVideoRefBlock;

export interface LearnerDeliveryContentDocument {
  readonly schemaVersion: ContentDocumentV1['schemaVersion'];
  readonly blocks: readonly LearnerDeliveryContentBlock[];
}
