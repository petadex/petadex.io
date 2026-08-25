-- Migration 003: preserve ProtParam records as JSON text.
--
-- Migration 002 has already been applied in the production RDS instance. Early
-- versions declared organisms.pp as REAL even though the atlas detail endpoint
-- and CSV store an array of ProtParam records. This follow-on migration keeps any
-- legacy scalar value as text and makes future JSON values safe to load.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organisms'
      AND column_name = 'pp'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE organisms
      ALTER COLUMN pp TYPE TEXT
      USING pp::text;
  END IF;
END $$;