export function isAuthRbacDemoEnabled(
  nodeEnv: string | undefined,
  rawEnabledFlag: string | undefined,
): boolean {
  if (nodeEnv?.trim().toLowerCase() === 'production') {
    return false;
  }

  const normalizedFlag = rawEnabledFlag?.trim().toLowerCase();

  return normalizedFlag === 'true' || normalizedFlag === '1';
}

export function isAuthRbacDemoEnabledFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return isAuthRbacDemoEnabled(environment['NODE_ENV'], environment['AUTH_RBAC_DEMO_ENABLED']);
}
