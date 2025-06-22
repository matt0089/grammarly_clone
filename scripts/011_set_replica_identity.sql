-- Set REPLICA IDENTITY to FULL for the workspaces table.
-- This is necessary for Supabase Realtime to function correctly with RLS,
-- as it ensures that the previous values of updated rows are available
-- to the replication stream.

ALTER TABLE public.workspaces REPLICA IDENTITY FULL; 