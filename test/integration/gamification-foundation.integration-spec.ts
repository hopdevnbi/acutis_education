import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'gami002-';

interface TestContext {
  parishId: string;
  academicYearId: string;
  classId: string;
  enrollmentId: string;
  studentId: string;
  userId: string;
}

async function insertUser(email: string): Promise<string> {
  const id = generateUuidV4();
  await AppDataSource.query(
    `
      INSERT INTO users (id, email, password_hash, status, created_at, updated_at)
      VALUES (@0, @1, @2, @3, GETUTCDATE(), GETUTCDATE())
    `,
    [id, email, 'test-hash', 'ACTIVE'],
  );
  return id;
}

async function insertTestContext(codeSuffix: string): Promise<TestContext> {
  const parishId = generateUuidV4();
  const academicYearId = generateUuidV4();
  const catechismLevelId = generateUuidV4();
  const classId = generateUuidV4();
  const studentId = generateUuidV4();
  const enrollmentId = generateUuidV4();
  const userId = await insertUser(`${TEST_CODE_PREFIX}${codeSuffix}@example.com`);

  await AppDataSource.query(
    `
      INSERT INTO parishes (id, code, name, status, created_at, updated_at)
      VALUES (@0, @1, @2, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [parishId, `${TEST_CODE_PREFIX}${codeSuffix}`, `Gami Parish ${codeSuffix}`],
  );

  await AppDataSource.query(
    `
      INSERT INTO academic_years (
        id, parish_id, name, start_date, end_date, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, '2026-09-01', '2027-06-30', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [academicYearId, parishId, `${TEST_CODE_PREFIX}${codeSuffix}-year`],
  );

  await AppDataSource.query(
    `
      INSERT INTO catechism_levels (
        id, parish_id, code, name, sort_order, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, 'Level One', 1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [catechismLevelId, parishId, `${TEST_CODE_PREFIX}${codeSuffix}-level`],
  );

  await AppDataSource.query(
    `
      INSERT INTO classes (
        id, parish_id, academic_year_id, catechism_level_id, code, name, status, created_at, updated_at
      )
      VALUES (@0, @1, @2, @3, @4, 'Gami Class', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [classId, parishId, academicYearId, catechismLevelId, `${TEST_CODE_PREFIX}${codeSuffix}-class`],
  );

  await AppDataSource.query(
    `
      INSERT INTO students (id, user_id, full_name, status, created_at, updated_at)
      VALUES (@0, NULL, @1, 'ACTIVE', GETUTCDATE(), GETUTCDATE())
    `,
    [studentId, `Student ${codeSuffix}`],
  );

  await AppDataSource.query(
    `
      INSERT INTO enrollments (
        id, student_id, class_id, parish_id, academic_year_id, status, enrolled_at, created_at, updated_at
      )
      VALUES (@0, @1, @2, @3, @4, 'ACTIVE', GETUTCDATE(), GETUTCDATE(), GETUTCDATE())
    `,
    [enrollmentId, studentId, classId, parishId, academicYearId],
  );

  return { parishId, academicYearId, classId, enrollmentId, studentId, userId };
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await AppDataSource.query(
    `
      SELECT 1 AS ok
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = @0
    `,
    [tableName],
  );
  return rows.length > 0;
}

async function getForeignKeyDeleteAction(
  tableName: string,
  columnName: string,
): Promise<string | null> {
  const rows = await AppDataSource.query(
    `
      SELECT rc.delete_referential_action_desc AS deleteAction
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
      INNER JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
      INNER JOIN sys.tables t ON t.object_id = fk.parent_object_id
      INNER JOIN sys.referential_constraints rc ON rc.constraint_object_id = fk.object_id
      WHERE t.name = @0 AND c.name = @1
    `,
    [tableName, columnName],
  );
  return rows[0]?.deleteAction ?? null;
}

describe('Gamification foundation (MSSQL integration)', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('expects all nine gamification tables', async () => {
    const tables = [
      'reward_rules',
      'processed_reward_events',
      'point_ledger_entries',
      'badge_definitions',
      'badge_awards',
      'mission_definitions',
      'mission_progress',
      'milestone_definitions',
      'milestone_achievements',
    ];
    for (const table of tables) {
      expect(await tableExists(table)).toBe(true);
    }
  });

  it('enforces unique reward_rules.code', async () => {
    const ctx = await insertTestContext('rule-uq');
    const id1 = generateUuidV4();
    const id2 = generateUuidV4();
    const code = `${TEST_CODE_PREFIX}rule-code`;

    await AppDataSource.query(
      `
        INSERT INTO reward_rules (
          id, code, event_type, source_type, points, status, max_awards_per_source,
          scope_type, parish_id, effective_from, effective_to, created_at, updated_at
        )
        VALUES (@0, @1, 'LEARNING_LESSON_COMPLETED', 'LESSON_COMPLETED', 10, 'ACTIVE', 1,
                'GLOBAL', NULL, NULL, NULL, GETUTCDATE(), GETUTCDATE())
      `,
      [id1, code],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO reward_rules (
            id, code, event_type, source_type, points, status, max_awards_per_source,
            scope_type, parish_id, effective_from, effective_to, created_at, updated_at
          )
          VALUES (@0, @1, 'LEARNING_LESSON_COMPLETED', 'LESSON_COMPLETED', 5, 'ACTIVE', 1,
                  'PARISH', @2, NULL, NULL, GETUTCDATE(), GETUTCDATE())
        `,
        [id2, code, ctx.parishId],
      ),
    ).rejects.toThrow();
  });

  it('enforces unique processed_reward_events.event_id', async () => {
    const ctx = await insertTestContext('evt-uq');
    const eventId = generateUuidV4();
    const sourceId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO processed_reward_events (
          id, event_id, event_type, student_id, source_id, processed_at, created_at
        )
        VALUES (@0, @1, 'LEARNING_LESSON_COMPLETED', @2, @3, GETUTCDATE(), GETUTCDATE())
      `,
      [generateUuidV4(), eventId, ctx.studentId, sourceId],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO processed_reward_events (
            id, event_id, event_type, student_id, source_id, processed_at, created_at
          )
          VALUES (@0, @1, 'LEARNING_LESSON_COMPLETED', @2, @3, GETUTCDATE(), GETUTCDATE())
        `,
        [generateUuidV4(), eventId, ctx.studentId, sourceId],
      ),
    ).rejects.toThrow();
  });

  it('enforces unique automatic award identity on point ledger', async () => {
    const ctx = await insertTestContext('ledger-uq');
    const sourceId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO point_ledger_entries (
          id, student_id, enrollment_id, parish_id, academic_year_id, points_delta,
          source_type, source_id, reason_code, description_key, staff_note,
          awarded_by_user_id, related_ledger_entry_id, created_at
        )
        VALUES (
          @0, @1, @2, @3, @4, 10, 'LESSON_COMPLETED', @5, 'RULE_A', NULL, NULL, NULL, NULL, GETUTCDATE()
        )
      `,
      [generateUuidV4(), ctx.studentId, ctx.enrollmentId, ctx.parishId, ctx.academicYearId, sourceId],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO point_ledger_entries (
            id, student_id, enrollment_id, parish_id, academic_year_id, points_delta,
            source_type, source_id, reason_code, description_key, staff_note,
            awarded_by_user_id, related_ledger_entry_id, created_at
          )
          VALUES (
            @0, @1, @2, @3, @4, 10, 'LESSON_COMPLETED', @5, 'RULE_A', NULL, NULL, NULL, NULL, GETUTCDATE()
          )
        `,
        [
          generateUuidV4(),
          ctx.studentId,
          ctx.enrollmentId,
          ctx.parishId,
          ctx.academicYearId,
          sourceId,
        ],
      ),
    ).rejects.toThrow();
  });

  it('rejects zero points_delta on ledger (append-only model check)', async () => {
    const ctx = await insertTestContext('ledger-zero');
    await expect(
      AppDataSource.query(
        `
          INSERT INTO point_ledger_entries (
            id, student_id, enrollment_id, parish_id, academic_year_id, points_delta,
            source_type, source_id, reason_code, description_key, staff_note,
            awarded_by_user_id, related_ledger_entry_id, created_at
          )
          VALUES (
            @0, @1, @2, @3, @4, 0, 'MANUAL_AWARD', @5, 'ZERO', NULL, NULL, NULL, NULL, GETUTCDATE()
          )
        `,
        [
          generateUuidV4(),
          ctx.studentId,
          ctx.enrollmentId,
          ctx.parishId,
          ctx.academicYearId,
          generateUuidV4(),
        ],
      ),
    ).rejects.toThrow();
  });

  it('uses NO ACTION delete on ledger student FK for historical safety', async () => {
    const action = await getForeignKeyDeleteAction('point_ledger_entries', 'student_id');
    expect(action).toBe('NO_ACTION');
  });

  it('enforces unique badge_definitions.code', async () => {
    const code = `${TEST_CODE_PREFIX}badge`;
    await AppDataSource.query(
      `
        INSERT INTO badge_definitions (
          id, code, name, description, category, scope_type, parish_id, status, award_mode,
          rule_event_type, rule_config_json, points_bonus, icon_media_asset_id, created_at, updated_at
        )
        VALUES (
          @0, @1, N'Badge', NULL, 'LEARNING', 'GLOBAL', NULL, 'ACTIVE', 'MANUAL',
          NULL, NULL, NULL, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [generateUuidV4(), code],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO badge_definitions (
            id, code, name, description, category, scope_type, parish_id, status, award_mode,
            rule_event_type, rule_config_json, points_bonus, icon_media_asset_id, created_at, updated_at
          )
          VALUES (
            @0, @1, N'Badge 2', NULL, 'LEARNING', 'GLOBAL', NULL, 'DRAFT', 'MANUAL',
            NULL, NULL, NULL, NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [generateUuidV4(), code],
      ),
    ).rejects.toThrow();
  });

  it('enforces filtered unique active badge awards', async () => {
    const ctx = await insertTestContext('badge-active');
    const badgeId = generateUuidV4();
    await AppDataSource.query(
      `
        INSERT INTO badge_definitions (
          id, code, name, description, category, scope_type, parish_id, status, award_mode,
          rule_event_type, rule_config_json, points_bonus, icon_media_asset_id, created_at, updated_at
        )
        VALUES (
          @0, @1, N'Active Badge', NULL, 'LEARNING', 'GLOBAL', NULL, 'ACTIVE', 'BOTH',
          NULL, NULL, 0, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [badgeId, `${TEST_CODE_PREFIX}active-badge`],
    );

    await AppDataSource.query(
      `
        INSERT INTO badge_awards (
          id, badge_definition_id, student_id, enrollment_id, parish_id, awarded_at,
          source_type, source_id, awarded_by_user_id, revoked_at, created_at
        )
        VALUES (@0, @1, @2, @3, @4, GETUTCDATE(), 'MANUAL_AWARD', @5, NULL, NULL, GETUTCDATE())
      `,
      [generateUuidV4(), badgeId, ctx.studentId, ctx.enrollmentId, ctx.parishId, generateUuidV4()],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO badge_awards (
            id, badge_definition_id, student_id, enrollment_id, parish_id, awarded_at,
            source_type, source_id, awarded_by_user_id, revoked_at, created_at
          )
          VALUES (@0, @1, @2, @3, @4, GETUTCDATE(), 'MANUAL_AWARD', @5, NULL, NULL, GETUTCDATE())
        `,
        [
          generateUuidV4(),
          badgeId,
          ctx.studentId,
          ctx.enrollmentId,
          ctx.parishId,
          generateUuidV4(),
        ],
      ),
    ).rejects.toThrow();
  });

  it('enforces mission scope_key + code uniqueness and progress uniqueness', async () => {
    const ctx = await insertTestContext('mission');
    const missionId = generateUuidV4();
    const scopeKey = `CLASS:${ctx.classId}`;
    const code = `${TEST_CODE_PREFIX}mission`;

    await AppDataSource.query(
      `
        INSERT INTO mission_definitions (
          id, code, name, description, status, scope_type, parish_id, class_id, scope_key,
          condition_type, target_count, points_bonus, starts_at, ends_at, created_at, updated_at
        )
        VALUES (
          @0, @1, N'Mission', NULL, 'ACTIVE', 'CLASS', @2, @3, @4,
          'LESSONS_COMPLETED', 5, NULL, NULL, NULL, GETUTCDATE(), GETUTCDATE()
        )
      `,
      [missionId, code, ctx.parishId, ctx.classId, scopeKey],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO mission_definitions (
            id, code, name, description, status, scope_type, parish_id, class_id, scope_key,
            condition_type, target_count, points_bonus, starts_at, ends_at, created_at, updated_at
          )
          VALUES (
            @0, @1, N'Mission Dup', NULL, 'DRAFT', 'CLASS', @2, @3, @4,
            'LESSONS_COMPLETED', 3, NULL, NULL, NULL, GETUTCDATE(), GETUTCDATE()
          )
        `,
        [generateUuidV4(), code, ctx.parishId, ctx.classId, scopeKey],
      ),
    ).rejects.toThrow();

    await AppDataSource.query(
      `
        INSERT INTO mission_progress (
          id, mission_definition_id, student_id, enrollment_id, current_count, target_count,
          status, completed_at, last_event_id, created_at, updated_at
        )
        VALUES (@0, @1, @2, @3, 1, 5, 'ACTIVE', NULL, NULL, GETUTCDATE(), GETUTCDATE())
      `,
      [generateUuidV4(), missionId, ctx.studentId, ctx.enrollmentId],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO mission_progress (
            id, mission_definition_id, student_id, enrollment_id, current_count, target_count,
            status, completed_at, last_event_id, created_at, updated_at
          )
          VALUES (@0, @1, @2, @3, 2, 5, 'ACTIVE', NULL, NULL, GETUTCDATE(), GETUTCDATE())
        `,
        [generateUuidV4(), missionId, ctx.studentId, ctx.enrollmentId],
      ),
    ).rejects.toThrow();
  });

  it('enforces milestone code and achievement uniqueness; rejects sacramental trigger', async () => {
    const ctx = await insertTestContext('milestone');
    const milestoneId = generateUuidV4();
    const code = `${TEST_CODE_PREFIX}milestone`;

    await AppDataSource.query(
      `
        INSERT INTO milestone_definitions (
          id, code, name, description, status, trigger_type, trigger_config_json, sort_order,
          created_at, updated_at
        )
        VALUES (
          @0, @1, N'Milestone', NULL, 'ACTIVE', 'FIRST_LESSON_COMPLETED', NULL, 1,
          GETUTCDATE(), GETUTCDATE()
        )
      `,
      [milestoneId, code],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO milestone_definitions (
            id, code, name, description, status, trigger_type, trigger_config_json, sort_order,
            created_at, updated_at
          )
          VALUES (
            @0, @1, N'Milestone Dup', NULL, 'ACTIVE', 'FIRST_EXAM_COMPLETED', NULL, 2,
            GETUTCDATE(), GETUTCDATE()
          )
        `,
        [generateUuidV4(), code],
      ),
    ).rejects.toThrow();

    await expect(
      AppDataSource.query(
        `
          INSERT INTO milestone_definitions (
            id, code, name, description, status, trigger_type, trigger_config_json, sort_order,
            created_at, updated_at
          )
          VALUES (
            @0, @1, N'Sacramental', NULL, 'ACTIVE', 'BAPTISM', NULL, 3,
            GETUTCDATE(), GETUTCDATE()
          )
        `,
        [generateUuidV4(), `${TEST_CODE_PREFIX}baptism`],
      ),
    ).rejects.toThrow();

    await AppDataSource.query(
      `
        INSERT INTO milestone_achievements (
          id, milestone_definition_id, student_id, enrollment_id, parish_id, achieved_at,
          source_type, source_id, created_at
        )
        VALUES (@0, @1, @2, @3, @4, GETUTCDATE(), 'LESSON_COMPLETED', @5, GETUTCDATE())
      `,
      [generateUuidV4(), milestoneId, ctx.studentId, ctx.enrollmentId, ctx.parishId, generateUuidV4()],
    );

    await expect(
      AppDataSource.query(
        `
          INSERT INTO milestone_achievements (
            id, milestone_definition_id, student_id, enrollment_id, parish_id, achieved_at,
            source_type, source_id, created_at
          )
          VALUES (@0, @1, @2, @3, @4, GETUTCDATE(), 'LESSON_COMPLETED', @5, GETUTCDATE())
        `,
        [
          generateUuidV4(),
          milestoneId,
          ctx.studentId,
          ctx.enrollmentId,
          ctx.parishId,
          generateUuidV4(),
        ],
      ),
    ).rejects.toThrow();
  });

  it('rejects dangerous cascade delete actions on historical tables', async () => {
    for (const [table, column] of [
      ['point_ledger_entries', 'enrollment_id'],
      ['badge_awards', 'student_id'],
      ['mission_progress', 'mission_definition_id'],
      ['milestone_achievements', 'milestone_definition_id'],
    ] as const) {
      const action = await getForeignKeyDeleteAction(table, column);
      expect(action).toBe('NO_ACTION');
    }
  });
});
