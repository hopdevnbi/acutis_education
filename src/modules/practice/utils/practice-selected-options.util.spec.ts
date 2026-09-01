import {
  normalizeSelectedOptionIds,
  parseSelectedOptionIdsJson,
  selectedOptionSetsEqual,
  serializeSelectedOptionIdsJson,
} from './practice-selected-options.util';

describe('practice selected options utils', () => {
  const optionA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const optionB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  it('normalizes UUID casing and lexical order', () => {
    const normalized = normalizeSelectedOptionIds([optionB.toUpperCase(), optionA.toUpperCase()]);

    expect(normalized).toEqual([optionA, optionB]);
  });

  it('rejects empty and duplicate selections', () => {
    expect(() => normalizeSelectedOptionIds([])).toThrow(
      'At least one selected option id is required.',
    );
    expect(() => normalizeSelectedOptionIds([optionA, optionA])).toThrow(
      'Selected option ids must be unique.',
    );
  });

  it('serializes and parses deterministically', () => {
    const json = serializeSelectedOptionIdsJson([optionB, optionA]);
    const parsed = parseSelectedOptionIdsJson(json);

    expect(parsed).toEqual([optionA, optionB]);
    expect(json).toBe(JSON.stringify([optionA, optionB]));
  });

  it('compares semantic option sets regardless of input order', () => {
    expect(selectedOptionSetsEqual([optionB, optionA], [optionA, optionB])).toBe(true);
    expect(selectedOptionSetsEqual([optionA], [optionB])).toBe(false);
  });
});
