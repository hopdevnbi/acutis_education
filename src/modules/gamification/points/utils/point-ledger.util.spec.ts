import {
  assertNonZeroPointsDelta,
  buildPointLedgerIdentity,
  buildReversalDelta,
  buildReversalReasonCode,
  sumLifetimePositivePoints,
  sumPointsDelta,
} from './point-ledger.util';
import { ZeroPointsDeltaError } from '../../errors/gamification.errors';
import { PointLedgerService } from '../services/point-ledger.service';

describe('point-ledger.util', () => {
  it('sums points delta for balance math', () => {
    expect(sumPointsDelta([10, -3, 5])).toBe(12);
    expect(sumPointsDelta([])).toBe(0);
  });

  it('aggregates lifetime positive points only', () => {
    expect(sumLifetimePositivePoints([10, -3, 5, 0])).toBe(15);
  });

  it('rejects zero points delta', () => {
    expect(() => assertNonZeroPointsDelta(0)).toThrow(ZeroPointsDeltaError);
    expect(() => assertNonZeroPointsDelta(1.5)).toThrow(ZeroPointsDeltaError);
  });

  it('builds stable ledger identity keys', () => {
    expect(
      buildPointLedgerIdentity({
        studentId: 's1',
        sourceType: 'LESSON_COMPLETED',
        sourceId: 'src1',
        reasonCode: 'RULE_A',
      }),
    ).toBe('s1|LESSON_COMPLETED|src1|RULE_A');
  });

  it('builds compensating reversal representation', () => {
    expect(buildReversalDelta(25)).toBe(-25);
    expect(buildReversalReasonCode('RULE_A')).toBe('REVERSAL:RULE_A');
  });
});

describe('PointLedgerService append-only surface', () => {
  it('does not expose mutable balance or delete APIs', () => {
    const proto = PointLedgerService.prototype as unknown as Record<string, unknown>;

    expect(typeof proto.append).toBe('function');
    expect(typeof proto.reverseEntry).toBe('function');
    expect(typeof proto.getBalance).toBe('function');
    expect(typeof proto.listByStudentId).toBe('function');
    expect(proto.updatePoints).toBeUndefined();
    expect(proto.setBalance).toBeUndefined();
    expect(proto.deleteEntry).toBeUndefined();
  });
});
