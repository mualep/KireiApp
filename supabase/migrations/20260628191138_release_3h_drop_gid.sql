-- Migration: release_3h_drop_gid
-- Drops the gid column from worker_profiles as it is no longer used in any UI or API.

alter table public.worker_profiles drop column if exists gid;
