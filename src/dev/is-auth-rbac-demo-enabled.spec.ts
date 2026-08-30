import {
  isAuthRbacDemoEnabled,
  isAuthRbacDemoEnabledFromEnvironment,
} from './is-auth-rbac-demo-enabled';

describe('isAuthRbacDemoEnabled', () => {
  it('returns false in production regardless of flag', () => {
    expect(isAuthRbacDemoEnabled('production', 'true')).toBe(false);
  });

  it('returns false by default outside production', () => {
    expect(isAuthRbacDemoEnabled('development', undefined)).toBe(false);
    expect(isAuthRbacDemoEnabled('test', 'false')).toBe(false);
  });

  it('returns true only when explicitly enabled outside production', () => {
    expect(isAuthRbacDemoEnabled('development', 'true')).toBe(true);
    expect(isAuthRbacDemoEnabled('test', '1')).toBe(true);
  });

  it('reads values from process environment', () => {
    expect(
      isAuthRbacDemoEnabledFromEnvironment({
        NODE_ENV: 'development',
        AUTH_RBAC_DEMO_ENABLED: 'true',
      }),
    ).toBe(true);
  });
});
