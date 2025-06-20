-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspaces
CREATE POLICY "Users can view their own workspaces" ON public.workspaces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspaces" ON public.workspaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspaces" ON public.workspaces
    FOR DELETE USING (auth.uid() = user_id);

-- Add workspace_id column to documents table (nullable initially)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create default workspaces for existing users
INSERT INTO public.workspaces (name, description, user_id, is_default)
SELECT 
    'My Workspace' as name,
    'Default workspace' as description,
    user_id,
    true as is_default
FROM (
    SELECT DISTINCT user_id 
    FROM public.documents 
    WHERE user_id IS NOT NULL
) existing_users
ON CONFLICT DO NOTHING;

-- Update existing documents to belong to default workspaces
UPDATE public.documents 
SET workspace_id = (
    SELECT w.id 
    FROM public.workspaces w 
    WHERE w.user_id = documents.user_id 
    AND w.is_default = true 
    LIMIT 1
)
WHERE workspace_id IS NULL;

-- Now make workspace_id NOT NULL
ALTER TABLE public.documents ALTER COLUMN workspace_id SET NOT NULL;

-- Update RLS policies for documents to include workspace_id
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (
        auth.uid() = user_id AND 
        workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (
        auth.uid() = user_id AND 
        workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid())
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_default ON public.workspaces(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);

-- Create updated_at trigger for workspaces
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
