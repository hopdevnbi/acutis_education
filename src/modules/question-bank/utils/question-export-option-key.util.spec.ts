import { assignOptionExportKeys } from './question-export-option-key.util';

describe('assignOptionExportKeys', () => {
  it('uses unique option codes as export keys', () => {
    const assignment = assignOptionExportKeys([
      { id: '11111111-1111-4111-8111-111111111111', code: 'a', sortOrder: 1 },
      { id: '22222222-2222-4222-8222-222222222222', code: 'b', sortOrder: 2 },
    ]);

    expect(assignment.exportKeyByOptionId.get('11111111-1111-4111-8111-111111111111')).toBe('a');
    expect(assignment.exportKeyByOptionId.get('22222222-2222-4222-8222-222222222222')).toBe('b');
    expect(assignment.exportKeysInOrder).toEqual(['a', 'b']);
  });

  it('falls back to deterministic opt-N keys when codes are missing or duplicated', () => {
    const assignment = assignOptionExportKeys([
      { id: '11111111-1111-4111-8111-111111111111', code: 'a', sortOrder: 1 },
      { id: '22222222-2222-4222-8222-222222222222', code: 'a', sortOrder: 2 },
      { id: '33333333-3333-4333-8333-333333333333', code: null, sortOrder: 3 },
    ]);

    expect(assignment.exportKeysInOrder).toEqual(['a', 'opt-2', 'opt-3']);
  });
});
