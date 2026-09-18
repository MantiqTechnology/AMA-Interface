-- Prevent a partial or unrelated database from being accepted as the verified
-- Neon v2 baseline. ama_schema_migrations is created by the migration runner.
DO $$
DECLARE
  table_count integer;
  table_fingerprint text;
BEGIN
  SELECT count(*), md5(string_agg(table_name, ',' ORDER BY table_name))
    INTO table_count, table_fingerprint
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  IF table_count <> 286 OR table_fingerprint <> 'a3cac18694630467f4085fe54f8f2f9c' THEN
    RAISE EXCEPTION 'The Neon v2 baseline schema fingerprint does not match the verified import.';
  END IF;
END $$;
