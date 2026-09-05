import { ZeroPointsDeltaError } from '../errors/gamification.errors';
import type { PointLedgerIdentity } from '../interfaces/gamification.interfaces';

export function assertNonZeroPointsDelta(pointsDelta: number): void {
  if (!Number.isInteger(pointsDelta) || pointsDelta === 0) {
    throw new ZeroPointsDeltaError();
  }
}

export function buildPointLedgerIdentity(input: PointLedgerIdentity): string {
  return `${input.studentId}|${input.sourceType}|${input.sourceId}|${input.reasonCode}`;
}

export function sumPointsDelta(deltas: readonly number[]): number {
  return deltas.reduce((sum, delta) => sum + delta, 0);
}

export function sumLifetimePositivePoints(deltas: readonly number[]): number {
  return deltas.reduce((sum, delta) => (delta > 0 ? sum + delta : sum), 0);
}

export function buildReversalDelta(originalDelta: number): number {
  assertNonZeroPointsDelta(originalDelta);
  return -originalDelta;
}

export function buildReversalReasonCode(originalReasonCode: string): string {
  return `REVERSAL:${originalReasonCode}`;
}
