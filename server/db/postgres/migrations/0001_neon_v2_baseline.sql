-- The ama-postgres-import-test-v2 branch was imported and verified before
-- migration tracking was introduced. This migration intentionally records that
-- existing baseline rather than replaying SQLite DDL against PostgreSQL.
DO $$
BEGIN
  IF to_regclass('public.stations') IS NULL
    OR to_regclass('public.flight_operations') IS NULL
    OR to_regclass('public.flight_station_tasks') IS NULL
    OR to_regclass('public.flight_station_service_requests') IS NULL
    OR to_regclass('public.flight_station_costs') IS NULL THEN
    RAISE EXCEPTION 'The Neon v2 baseline schema is missing required Flight/Station tables.';
  END IF;
END $$;
