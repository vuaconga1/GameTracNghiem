-- AlterTable: per-unit skill cards (gameSkills + enabledSkills)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "gameSkills" JSONB;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "enabledSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Default all four skills on for existing rows that still have empty enabledSkills
UPDATE "Course"
SET "enabledSkills" = ARRAY['listening', 'reading', 'speaking', 'writing', 'vocabulary']::TEXT[]
WHERE "enabledSkills" IS NULL OR cardinality("enabledSkills") = 0;

-- Backfill gameSkills from enabledGames using the approved convention.
-- Empty enabledGames (= historically all visible): assign all catalog defaults.
-- Non-empty enabledGames: only those keys get a skill.
UPDATE "Course"
SET "gameSkills" = CASE
  WHEN "enabledGames" IS NULL OR cardinality("enabledGames") = 0 THEN
    jsonb_build_object(
      'read_and_complete', 'reading',
      'read_and_match', 'reading',
      'quiz', 'vocabulary',
      'vocabulary_check', 'reading',
      'choose_and_circle', 'reading',
      'word_match', 'reading',
      'vocabulary_test', 'reading',
      'pronunciation', 'speaking',
      'look_and_write', 'writing',
      'grammar', 'writing',
      'scramble', 'writing'
    )
  ELSE (
    SELECT COALESCE(jsonb_object_agg(key, skill), '{}'::jsonb)
    FROM (
      VALUES
        ('read_and_complete', 'reading'),
        ('read_and_match', 'reading'),
        ('quiz', 'vocabulary'),
        ('vocabulary_check', 'reading'),
        ('choose_and_circle', 'reading'),
        ('word_match', 'reading'),
        ('vocabulary_test', 'reading'),
        ('pronunciation', 'speaking'),
        ('look_and_write', 'writing'),
        ('grammar', 'writing'),
        ('scramble', 'writing')
    ) AS defaults(key, skill)
    WHERE key = ANY ("enabledGames")
  )
END
WHERE "gameSkills" IS NULL;

-- Keep legacy enabledGames in sync with assigned + enabled skills after backfill
UPDATE "Course"
SET "enabledGames" = COALESCE(
  (
    SELECT ARRAY(
      SELECT key
      FROM jsonb_each_text("gameSkills") AS t(key, skill)
      WHERE skill = ANY ("enabledSkills")
        AND skill IN ('listening', 'reading', 'speaking', 'writing', 'vocabulary')
      ORDER BY key
    )
  ),
  ARRAY[]::TEXT[]
)
WHERE "gameSkills" IS NOT NULL;
