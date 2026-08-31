export interface ShuffleRandomSource {
  next(): number;
}

export class DefaultShuffleRandomSource implements ShuffleRandomSource {
  next(): number {
    return Math.random();
  }
}

export function shuffleCopy<T>(items: readonly T[], random: ShuffleRandomSource): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random.next() * (index + 1));
    const current = copy[index];
    const swapValue = copy[swapIndex];
    copy[index] = swapValue;
    copy[swapIndex] = current;
  }

  return copy;
}
