import type {
  ContentBlock,
  ContentDocumentV1,
} from '../../learning-content/interfaces/learning-content.interface';
import type { TranslatableUnit, TranslatedUnit } from '../providers/translation-provider.interface';

function buildTranslatedMap(units: readonly TranslatedUnit[]): Map<string, string> {
  return new Map(units.map((unit) => [unit.id, unit.text]));
}

export function extractLearningContentTranslatableUnits(
  document: ContentDocumentV1,
): TranslatableUnit[] {
  const units: TranslatableUnit[] = [];

  document.blocks.forEach((block, blockIndex) => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
      case 'callout':
        units.push({ id: `block:${blockIndex}:text`, text: block.text });
        break;
      case 'bullet_list':
      case 'numbered_list':
        block.items.forEach((item, itemIndex) => {
          units.push({ id: `block:${blockIndex}:item:${itemIndex}`, text: item });
        });
        break;
      case 'scripture_ref':
        units.push({ id: `block:${blockIndex}:reference`, text: block.reference });
        if (block.text !== undefined && block.text.trim().length > 0) {
          units.push({ id: `block:${blockIndex}:text`, text: block.text });
        }
        break;
      case 'image_ref':
        if (block.alt !== undefined && block.alt.trim().length > 0) {
          units.push({ id: `block:${blockIndex}:alt`, text: block.alt });
        }
        if (block.caption !== undefined && block.caption.trim().length > 0) {
          units.push({ id: `block:${blockIndex}:caption`, text: block.caption });
        }
        break;
      case 'video_ref':
        if (block.caption !== undefined && block.caption.trim().length > 0) {
          units.push({ id: `block:${blockIndex}:caption`, text: block.caption });
        }
        break;
      default: {
        const exhaustiveCheck: never = block;
        throw new Error(`Unsupported content block type: ${String(exhaustiveCheck)}`);
      }
    }
  });

  return units;
}

function applyBlockTranslation(
  block: ContentBlock,
  blockIndex: number,
  translated: Map<string, string>,
): ContentBlock {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'callout':
      return {
        ...block,
        text: translated.get(`block:${blockIndex}:text`) ?? block.text,
      };
    case 'bullet_list':
    case 'numbered_list':
      return {
        ...block,
        items: block.items.map(
          (item, itemIndex) => translated.get(`block:${blockIndex}:item:${itemIndex}`) ?? item,
        ),
      };
    case 'scripture_ref':
      return {
        ...block,
        reference: translated.get(`block:${blockIndex}:reference`) ?? block.reference,
        text:
          block.text === undefined
            ? undefined
            : (translated.get(`block:${blockIndex}:text`) ?? block.text),
      };
    case 'image_ref':
      return {
        ...block,
        alt:
          block.alt === undefined
            ? undefined
            : (translated.get(`block:${blockIndex}:alt`) ?? block.alt),
        caption:
          block.caption === undefined
            ? undefined
            : (translated.get(`block:${blockIndex}:caption`) ?? block.caption),
      };
    case 'video_ref':
      return {
        ...block,
        caption:
          block.caption === undefined
            ? undefined
            : (translated.get(`block:${blockIndex}:caption`) ?? block.caption),
      };
    default: {
      const exhaustiveCheck: never = block;
      throw new Error(`Unsupported content block type: ${String(exhaustiveCheck)}`);
    }
  }
}

export function buildLearningContentTranslationPayload(
  document: ContentDocumentV1,
  translatedUnits: readonly TranslatedUnit[],
): Record<string, unknown> {
  const translated = buildTranslatedMap(translatedUnits);

  return {
    document: {
      schemaVersion: document.schemaVersion,
      blocks: document.blocks.map((block, blockIndex) =>
        applyBlockTranslation(block, blockIndex, translated),
      ),
    },
  };
}

export function applyLearningContentTranslation(
  document: ContentDocumentV1,
  payload: Record<string, unknown>,
): ContentDocumentV1 {
  const translatedDocument = payload['document'];

  if (
    translatedDocument === null ||
    typeof translatedDocument !== 'object' ||
    Array.isArray(translatedDocument)
  ) {
    throw new Error('Learning content translation payload must include a document object.');
  }

  const blocks = (translatedDocument as { blocks?: unknown }).blocks;

  if (!Array.isArray(blocks) || blocks.length !== document.blocks.length) {
    throw new Error('Learning content translation payload block count must match source.');
  }

  const mergedBlocks = document.blocks.map((sourceBlock, blockIndex) => {
    const translatedBlock: unknown = (blocks as unknown[])[blockIndex];

    if (
      translatedBlock === null ||
      typeof translatedBlock !== 'object' ||
      Array.isArray(translatedBlock)
    ) {
      throw new Error(`Invalid translated block at index ${blockIndex}.`);
    }

    const translatedType = (translatedBlock as { type?: unknown }).type;

    if (translatedType !== sourceBlock.type) {
      throw new Error(`Translated block type mismatch at index ${blockIndex}.`);
    }

    return applyBlockTranslation(
      sourceBlock,
      blockIndex,
      extractPayloadUnitMap(sourceBlock, blockIndex, translatedBlock as Record<string, unknown>),
    );
  });

  return {
    schemaVersion: document.schemaVersion,
    blocks: mergedBlocks,
  };
}

function extractPayloadUnitMap(
  sourceBlock: ContentBlock,
  blockIndex: number,
  translatedBlock: Record<string, unknown>,
): Map<string, string> {
  const map = new Map<string, string>();

  switch (sourceBlock.type) {
    case 'heading':
    case 'paragraph':
    case 'callout':
      readOptionalString(map, translatedBlock, 'text', `block:${blockIndex}:text`);
      break;
    case 'bullet_list':
    case 'numbered_list': {
      const items = translatedBlock['items'];
      if (Array.isArray(items)) {
        items.forEach((item, itemIndex) => {
          if (typeof item === 'string') {
            map.set(`block:${blockIndex}:item:${itemIndex}`, item);
          }
        });
      }
      break;
    }
    case 'scripture_ref':
      readOptionalString(map, translatedBlock, 'reference', `block:${blockIndex}:reference`);
      readOptionalString(map, translatedBlock, 'text', `block:${blockIndex}:text`);
      break;
    case 'image_ref':
      readOptionalString(map, translatedBlock, 'alt', `block:${blockIndex}:alt`);
      readOptionalString(map, translatedBlock, 'caption', `block:${blockIndex}:caption`);
      break;
    case 'video_ref':
      readOptionalString(map, translatedBlock, 'caption', `block:${blockIndex}:caption`);
      break;
    default:
      break;
  }

  return map;
}

function readOptionalString(
  map: Map<string, string>,
  block: Record<string, unknown>,
  field: string,
  unitId: string,
): void {
  const value = block[field];

  if (typeof value === 'string') {
    map.set(unitId, value);
  }
}
