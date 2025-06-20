-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add workspace_id to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id_default ON public.workspaces(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);

-- Enable RLS on workspaces table
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

-- Update documents RLS policy to include workspace access
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE workspaces.id = documents.workspace_id 
            AND workspaces.user_id = auth.uid()
        )
    );

-- Create default workspaces for existing users and migrate their documents
DO $$
DECLARE
    user_record RECORD;
    default_workspace_id UUID;
BEGIN
    -- Loop through all existing users who have documents
    FOR user_record IN 
        SELECT DISTINCT user_id FROM public.documents 
        WHERE workspace_id IS NULL
    LOOP
        -- Create a default workspace for each user
        INSERT INTO public.workspaces (name, description, user_id, is_default)
        VALUES ('My Workspace', 'Default workspace', user_record.user_id, TRUE)
        RETURNING id INTO default_workspace_id;
        
        -- Update all documents for this user to belong to the default workspace
        UPDATE public.documents 
        SET workspace_id = default_workspace_id 
        WHERE user_id = user_record.user_id AND workspace_id IS NULL;
    END LOOP;
END $$;

-- Make workspace_id NOT NULL after migration
ALTER TABLE public.documents 
ALTER COLUMN workspace_id SET NOT NULL;

-- Create function to automatically create default workspace for new users
CREATE OR REPLACE FUNCTION public.create_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspaces (name, description, user_id, is_default)
    VALUES ('My Workspace', 'Default workspace', NEW.id, TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default workspace when user profile is created
CREATE OR REPLACE TRIGGER create_default_workspace_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_workspace();

-- Update the updated_at timestamp function for workspaces
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workspaces updated_at
CREATE TRIGGER handle_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
