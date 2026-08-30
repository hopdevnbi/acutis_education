export const AUTH_RBAC_SAMPLE_PASSWORD = 'LocalDev!Sample2026' as const;

export const AUTH_RBAC_SAMPLE_DOMAIN = 'local.catechism.test' as const;

export interface AuthRbacSeedRoleDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export interface AuthRbacSeedPermissionDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
}

export interface AuthRbacSeedUserDefinition {
  readonly email: string;
  readonly roleCode: string;
}

export const AUTH_RBAC_SEED_ROLES: readonly AuthRbacSeedRoleDefinition[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Local sample role with all seeded permissions.',
  },
  {
    code: 'PARISH_ADMIN',
    name: 'Parish Admin',
    description: 'Local sample parish administrator role.',
  },
  {
    code: 'CATECHIST',
    name: 'Catechist',
    description: 'Local sample catechist role.',
  },
  {
    code: 'PARENT',
    name: 'Parent',
    description: 'Local sample parent role.',
  },
] as const;

export const AUTH_RBAC_SEED_PERMISSIONS: readonly AuthRbacSeedPermissionDefinition[] = [
  {
    code: 'users.read',
    name: 'Read users',
    description: 'Local sample permission to read user records.',
  },
  {
    code: 'users.manage',
    name: 'Manage users',
    description: 'Local sample permission to manage user records.',
  },
  {
    code: 'classes.read',
    name: 'Read classes',
    description: 'Local sample permission to read class records.',
  },
  {
    code: 'classes.manage',
    name: 'Manage classes',
    description: 'Local sample permission to manage class records.',
  },
  {
    code: 'auth.test.read',
    name: 'Auth test read',
    description: 'Local dev-only permission for RBAC read verification.',
  },
  {
    code: 'auth.test.manage',
    name: 'Auth test manage',
    description: 'Local dev-only permission for RBAC manage verification.',
  },
  {
    code: 'parishes.read',
    name: 'Read parishes',
    description: 'Local sample permission to read parish records.',
  },
  {
    code: 'parishes.manage',
    name: 'Manage parishes',
    description: 'Local sample permission to manage parish records.',
  },
  {
    code: 'academic-years.read',
    name: 'Read academic years',
    description: 'Local sample permission to read academic year records.',
  },
  {
    code: 'academic-years.manage',
    name: 'Manage academic years',
    description: 'Local sample permission to manage academic year records.',
  },
  {
    code: 'catechism-levels.read',
    name: 'Read catechism levels',
    description: 'Local sample permission to read catechism level records.',
  },
  {
    code: 'catechism-levels.manage',
    name: 'Manage catechism levels',
    description: 'Local sample permission to manage catechism level records.',
  },
] as const;

export const AUTH_RBAC_ROLE_PERMISSION_MATRIX: Readonly<Record<string, readonly string[]>> = {
  SUPER_ADMIN: AUTH_RBAC_SEED_PERMISSIONS.map((permission) => permission.code),
  PARISH_ADMIN: [
    'users.read',
    'users.manage',
    'classes.read',
    'classes.manage',
    'auth.test.read',
    'auth.test.manage',
    'parishes.read',
    'parishes.manage',
    'academic-years.read',
    'academic-years.manage',
    'catechism-levels.read',
    'catechism-levels.manage',
  ],
  CATECHIST: [
    'classes.read',
    'classes.manage',
    'auth.test.read',
    'parishes.read',
    'academic-years.read',
    'catechism-levels.read',
  ],
  PARENT: ['classes.read', 'parishes.read', 'academic-years.read', 'catechism-levels.read'],
};

export const AUTH_RBAC_SEED_USERS: readonly AuthRbacSeedUserDefinition[] = [
  {
    email: `superadmin@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    roleCode: 'SUPER_ADMIN',
  },
  {
    email: `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    roleCode: 'PARISH_ADMIN',
  },
  {
    email: `catechist@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    roleCode: 'CATECHIST',
  },
  {
    email: `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    roleCode: 'PARENT',
  },
] as const;
