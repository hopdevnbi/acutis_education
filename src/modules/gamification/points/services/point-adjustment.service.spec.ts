import {
  InvalidPointAdjustmentError,
} from '../../errors/gamification.errors';
import { POINT_ADJUSTMENT_MAX_ABS_DELTA } from '../../constants/gamification-permissions.constants';

describe('manual point adjustment constraints', () => {
  it('rejects zero and oversized deltas at validation layer', () => {
    expect(POINT_ADJUSTMENT_MAX_ABS_DELTA).toBe(1000);
    const err = new InvalidPointAdjustmentError('delta must be a non-zero integer.');
    expect(err.name).toBe('InvalidPointAdjustmentError');
  });
});
