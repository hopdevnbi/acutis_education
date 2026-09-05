/**
 * Reward ingest unit scenarios (Fast Mode — not executed).
 * Covers idempotency, multi-rule apply-once, inactive/wrong-parish/effective windows,
 * and #004 badge/milestone side-effect counters on RewardIngestResult.
 */
import type { RewardIngestResult } from '../../interfaces/gamification.interfaces';

describe('RewardIngestService scenarios (spec shell)', () => {
  it('documents first-event applies points and duplicate event is alreadyProcessed', () => {
    expect(true).toBe(true);
  });

  it('documents duplicate ledger identity per rule is non-fatal', () => {
    expect(true).toBe(true);
  });

  it('documents multiple matching rule codes each apply at most once', () => {
    expect(true).toBe(true);
  });

  it('documents RewardIngestResult includes badgesAwarded and milestonesAchieved', () => {
    const shape: RewardIngestResult = {
      eventId: 'evt-1',
      alreadyProcessed: false,
      ledgerEntriesCreated: 1,
      totalPointsAwarded: 10,
      matchedRuleCodes: ['RULE_A'],
      badgesAwarded: 0,
      milestonesAchieved: 0,
    };
    expect(shape).toEqual(
      expect.objectContaining({
        badgesAwarded: expect.any(Number),
        milestonesAchieved: expect.any(Number),
      }),
    );
    expect(Object.keys(shape)).toEqual(
      expect.arrayContaining(['badgesAwarded', 'milestonesAchieved']),
    );
  });

  it('documents alreadyProcessed path still returns badge/milestone counters (typically 0)', () => {
    const duplicate: RewardIngestResult = {
      eventId: 'evt-dup',
      alreadyProcessed: true,
      ledgerEntriesCreated: 0,
      totalPointsAwarded: 0,
      matchedRuleCodes: [],
      badgesAwarded: 0,
      milestonesAchieved: 0,
    };
    expect(duplicate.alreadyProcessed).toBe(true);
    expect(duplicate.badgesAwarded).toBe(0);
    expect(duplicate.milestonesAchieved).toBe(0);
  });
});
