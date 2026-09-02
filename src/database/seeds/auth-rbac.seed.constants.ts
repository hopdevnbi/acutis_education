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
  {
    code: 'STUDENT',
    name: 'Student',
    description: 'Local sample linked learner account for formal self-scoped actions.',
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
  {
    code: 'students.read',
    name: 'Read students',
    description: 'Local sample permission to read student records.',
  },
  {
    code: 'students.manage',
    name: 'Manage students',
    description: 'Local sample permission to manage student records.',
  },
  {
    code: 'student-guardians.read',
    name: 'Read student guardians',
    description: 'Local sample permission to read guardian link records.',
  },
  {
    code: 'student-guardians.manage',
    name: 'Manage student guardians',
    description: 'Local sample permission to manage guardian link records.',
  },
  {
    code: 'class-catechists.read',
    name: 'Read class catechists',
    description: 'Local sample permission to read catechist assignment records.',
  },
  {
    code: 'class-catechists.manage',
    name: 'Manage class catechists',
    description: 'Local sample permission to manage catechist assignment records.',
  },
  {
    code: 'enrollments.read',
    name: 'Read enrollments',
    description: 'Local sample permission to read enrollment records.',
  },
  {
    code: 'enrollments.manage',
    name: 'Manage enrollments',
    description: 'Local sample permission to manage enrollment records.',
  },
  {
    code: 'curricula.read',
    name: 'Read curricula',
    description: 'Local sample permission to read curriculum records.',
  },
  {
    code: 'curricula.manage',
    name: 'Manage curricula',
    description: 'Local sample permission to manage curriculum records.',
  },
  {
    code: 'curricula.publish',
    name: 'Publish curricula',
    description: 'Local sample permission to publish curriculum versions.',
  },
  {
    code: 'lesson-content.read',
    name: 'Read lesson content',
    description: 'Local sample permission to read draft lesson content.',
  },
  {
    code: 'lesson-content.manage',
    name: 'Manage lesson content',
    description: 'Local sample permission to manage draft lesson content.',
  },
  {
    code: 'media.read',
    name: 'Read media assets',
    description: 'Local sample permission to read media metadata and authorized content.',
  },
  {
    code: 'media.upload',
    name: 'Upload media assets',
    description: 'Local sample permission to upload media assets.',
  },
  {
    code: 'media.manage',
    name: 'Manage media assets',
    description: 'Local sample permission to manage media assets.',
  },
  {
    code: 'questions.read',
    name: 'Read questions',
    description: 'Local sample permission to read question bank records.',
  },
  {
    code: 'questions.manage',
    name: 'Manage questions',
    description: 'Local sample permission to manage question bank records.',
  },
  {
    code: 'questions.publish',
    name: 'Publish questions',
    description: 'Local sample permission to publish question versions.',
  },
  {
    code: 'practice.read',
    name: 'Read practice sessions',
    description: 'Local sample permission to read practice sessions and progress.',
  },
  {
    code: 'practice.manage',
    name: 'Manage practice sessions',
    description: 'Local sample permission to start sessions and submit answers.',
  },
  {
    code: 'learning-progress.read',
    name: 'Read learning progress',
    description: 'Local sample permission to read lesson and aggregate learning progress.',
  },
  {
    code: 'learning-progress.manage',
    name: 'Manage learning progress',
    description: 'Local sample permission to update linked learner lesson progress.',
  },
  {
    code: 'localization.read',
    name: 'Read localization',
    description: 'Local sample permission to read translation resources and revisions.',
  },
  {
    code: 'localization.manage',
    name: 'Manage localization',
    description: 'Local sample permission to request and review translations.',
  },
  {
    code: 'localization.approve',
    name: 'Approve localization',
    description: 'Local sample permission to approve translations for learner delivery.',
  },
  {
    code: 'learner.self.read',
    name: 'Read own learner context',
    description:
      'Resolve linked student profile and active enrollments for the authenticated user.',
  },
  {
    code: 'exam.read',
    name: 'Read exams',
    description: 'Local sample permission to read exam definitions, versions, and assignments.',
  },
  {
    code: 'exam.manage',
    name: 'Manage exams',
    description: 'Local sample permission to author draft exams and versions.',
  },
  {
    code: 'exam.publish',
    name: 'Publish exams',
    description: 'Local sample permission to publish exam versions.',
  },
  {
    code: 'exam.assign',
    name: 'Assign exams',
    description: 'Local sample permission to create and manage class exam assignments.',
  },
  {
    code: 'exam.attempt',
    name: 'Attempt exams',
    description: 'Local sample permission to start and submit formal exam attempts.',
  },
  {
    code: 'exam.result.read',
    name: 'Read exam results',
    description: 'Local sample permission to read formal exam attempt results.',
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
    'students.read',
    'students.manage',
    'student-guardians.read',
    'student-guardians.manage',
    'class-catechists.read',
    'class-catechists.manage',
    'enrollments.read',
    'enrollments.manage',
    'curricula.read',
    'curricula.manage',
    'curricula.publish',
    'lesson-content.read',
    'lesson-content.manage',
    'media.read',
    'media.upload',
    'media.manage',
    'questions.read',
    'questions.manage',
    'questions.publish',
    'practice.read',
    'learning-progress.read',
    'localization.read',
    'localization.manage',
    'localization.approve',
    'exam.read',
    'exam.manage',
    'exam.publish',
    'exam.assign',
    'exam.result.read',
  ],
  CATECHIST: [
    'classes.read',
    'classes.manage',
    'auth.test.read',
    'parishes.read',
    'academic-years.read',
    'catechism-levels.read',
    'students.read',
    'student-guardians.read',
    'class-catechists.read',
    'enrollments.read',
    'curricula.read',
    'lesson-content.read',
    'questions.read',
    'practice.read',
    'learning-progress.read',
    'localization.read',
    'exam.read',
    'exam.result.read',
  ],
  PARENT: [
    'classes.read',
    'parishes.read',
    'academic-years.read',
    'catechism-levels.read',
    'students.read',
    'student-guardians.read',
    'enrollments.read',
    'curricula.read',
    'lesson-content.read',
    'practice.read',
    'practice.manage',
    'learning-progress.read',
    'learning-progress.manage',
  ],
  STUDENT: ['learner.self.read', 'curricula.read', 'lesson-content.read', 'learning-progress.read'],
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
  {
    email: `student-alpha@${AUTH_RBAC_SAMPLE_DOMAIN}`,
    roleCode: 'STUDENT',
  },
] as const;
