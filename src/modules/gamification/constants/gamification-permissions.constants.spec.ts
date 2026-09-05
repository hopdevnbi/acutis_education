import {
  AUTH_RBAC_ROLE_PERMISSION_MATRIX,
  AUTH_RBAC_SEED_PERMISSIONS,
} from '../../../database/seeds/auth-rbac.seed.constants';
import {
  BADGES_AWARD_PERMISSION,
  GAMIFICATION_MANAGE_PERMISSION,
  GAMIFICATION_PERMISSIONS,
  GAMIFICATION_READ_PERMISSION,
  POINTS_ADJUST_PERMISSION,
} from '../constants/gamification-permissions.constants';

describe('gamification RBAC permissions', () => {
  it('seeds exactly the four gamification permissions', () => {
    const codes = AUTH_RBAC_SEED_PERMISSIONS.map((p) => p.code);
    for (const permission of GAMIFICATION_PERMISSIONS) {
      expect(codes).toContain(permission);
    }
  });

  it('applies the role matrix from #001', () => {
    const matrix = AUTH_RBAC_ROLE_PERMISSION_MATRIX;

    expect(matrix.SUPER_ADMIN).toEqual(
      expect.arrayContaining([...GAMIFICATION_PERMISSIONS]),
    );
    expect(matrix.PARISH_ADMIN).toEqual(
      expect.arrayContaining([
        GAMIFICATION_READ_PERMISSION,
        GAMIFICATION_MANAGE_PERMISSION,
        POINTS_ADJUST_PERMISSION,
        BADGES_AWARD_PERMISSION,
      ]),
    );
    expect(matrix.CATECHIST).toEqual(
      expect.arrayContaining([
        GAMIFICATION_READ_PERMISSION,
        GAMIFICATION_MANAGE_PERMISSION,
        POINTS_ADJUST_PERMISSION,
        BADGES_AWARD_PERMISSION,
      ]),
    );
    expect(matrix.PARENT).toContain(GAMIFICATION_READ_PERMISSION);
    expect(matrix.PARENT).not.toContain(GAMIFICATION_MANAGE_PERMISSION);
    expect(matrix.PARENT).not.toContain(POINTS_ADJUST_PERMISSION);
    expect(matrix.PARENT).not.toContain(BADGES_AWARD_PERMISSION);
    expect(matrix.STUDENT).toContain(GAMIFICATION_READ_PERMISSION);
    expect(matrix.STUDENT).not.toContain(GAMIFICATION_MANAGE_PERMISSION);
    expect(matrix.STUDENT).not.toContain(POINTS_ADJUST_PERMISSION);
    expect(matrix.STUDENT).not.toContain(BADGES_AWARD_PERMISSION);
  });
});
