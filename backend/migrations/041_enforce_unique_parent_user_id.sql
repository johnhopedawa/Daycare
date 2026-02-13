-- Migration 041: Enforce one parent profile per parent user account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_parents_user_id_nonnull'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM parents
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipping uq_parents_user_id_nonnull; duplicate parents.user_id values exist.';
    ELSE
      EXECUTE 'CREATE UNIQUE INDEX uq_parents_user_id_nonnull
               ON parents(user_id)
               WHERE user_id IS NOT NULL';
    END IF;
  END IF;
END $$;
