-- Fix for Realtime RLS issue on workspaces table
-- This policy allows anonymous users to connect to the realtime websocket,
-- but prevents them from reading any data from the workspaces table.

CREATE POLICY "Allow anon read access on workspaces with always-false condition"
ON public.workspaces
FOR SELECT
TO anon
USING (false); 