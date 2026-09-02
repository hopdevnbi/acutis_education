import { DefaultShuffleRandomSource, shuffleCopy } from './exam-shuffle.util';

describe('exam-shuffle.util', () => {
  it('returns a permutation with the same elements', () => {
    const random = { next: (): number => 0 };
    const shuffled = shuffleCopy(['a', 'b', 'c'], random);

    expect([...shuffled].sort()).toEqual(['a', 'b', 'c']);
  });

  it('uses random source for shuffling', () => {
    const source = new DefaultShuffleRandomSource();
    const input = [1, 2, 3, 4, 5];
    const shuffled = shuffleCopy(input, source);

    expect(shuffled.sort()).toEqual(input.sort());
  });
});
