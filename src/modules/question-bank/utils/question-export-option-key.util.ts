export interface OptionExportKeyInput {
  readonly id: string;
  readonly code: string | null;
  readonly sortOrder: number;
}

export interface OptionExportKeyAssignment {
  readonly exportKeyByOptionId: ReadonlyMap<string, string>;
  readonly exportKeysInOrder: readonly string[];
}

export function assignOptionExportKeys(
  options: readonly OptionExportKeyInput[],
): OptionExportKeyAssignment {
  const sortedOptions = [...options].sort((left, right) => left.sortOrder - right.sortOrder);
  const usedExportKeys = new Set<string>();
  const exportKeyByOptionId = new Map<string, string>();
  const exportKeysInOrder: string[] = [];

  for (const [index, option] of sortedOptions.entries()) {
    const trimmedCode = option.code?.trim() ?? '';
    let exportKey: string;

    if (trimmedCode.length > 0 && !usedExportKeys.has(trimmedCode)) {
      exportKey = trimmedCode;
    } else {
      exportKey = `opt-${index + 1}`;
    }

    usedExportKeys.add(exportKey);
    exportKeyByOptionId.set(option.id, exportKey);
    exportKeysInOrder.push(exportKey);
  }

  return {
    exportKeyByOptionId,
    exportKeysInOrder,
  };
}
