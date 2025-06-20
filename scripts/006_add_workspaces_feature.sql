-- This script implements the database changes required for the multi-workspace feature.
-- It creates a new 'workspaces' table, adds a 'workspace_id' to the 'documents' table,
-- and updates Row Level Security policies to be workspace-aware.

-- Phase 1: Create workspaces table
-- This table will store workspace information, linking each workspace to a user.
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspaces IS 'Stores user-created workspaces.';
COMMENT ON COLUMN public.workspaces.user_id IS 'Foreign key to the user who owns the workspace.';
COMMENT ON COLUMN public.workspaces.name IS 'The name of the workspace.';

-- Phase 2: Add Row Level Security for workspaces
-- This ensures that users can only interact with their own workspaces.
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable CRUD for users based on user_id"
ON public.workspaces
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Phase 3: Alter documents table
-- Add a nullable workspace_id to associate documents with a workspace.
-- This will be made NOT NULL after a data migration.
ALTER TABLE public.documents
ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.documents.workspace_id IS 'Foreign key to the workspace the document belongs to.';

-- Phase 4: Update Row Level Security for documents
-- Drop the old policy and create a new one that accounts for workspaces.
-- This policy allows access if the user owns the document directly (for legacy documents)
-- or if they own the workspace the document belongs to.

-- It's safer to use IF EXISTS for dropping policies
DROP POLICY IF EXISTS "Enable CRUD for users based on user_id" ON public.documents;

CREATE POLICY "Enable CRUD based on workspace ownership or direct ownership"
ON public.documents
FOR ALL
USING (
  (workspace_id IS NULL AND auth.uid() = user_id) OR
  (EXISTS (SELECT 1 FROM public.workspaces WHERE id = documents.workspace_id AND user_id = auth.uid()))
)
WITH CHECK (
  (workspace_id IS NULL AND auth.uid() = user_id) OR
  (EXISTS (SELECT 1 FROM public.workspaces WHERE id = documents.workspace_id AND user_id = auth.uid()))
); 