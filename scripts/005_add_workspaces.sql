-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add workspace_id to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);

-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspaces table
CREATE POLICY "Users can view their own workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspaces" ON workspaces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for documents table to include workspace access
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- New RLS policies for documents that consider workspace ownership
CREATE POLICY "Users can view documents in their workspaces" ON documents
  FOR SELECT USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert documents in their workspaces" ON documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update documents in their workspaces" ON documents
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete documents in their workspaces" ON documents
  FOR DELETE USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

-- Create default workspace for existing users and update their documents
DO $$
DECLARE
  user_record RECORD;
  default_workspace_id UUID;
BEGIN
  -- Loop through all users who have documents but no workspaces
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM documents 
    WHERE user_id NOT IN (SELECT user_id FROM workspaces)
  LOOP
    -- Create default workspace for this user
    INSERT INTO workspaces (name, description, user_id, is_default)
    VALUES ('My Workspace', 'Default workspace', user_record.user_id, true)
    RETURNING id INTO default_workspace_id;
    
    -- Update all documents for this user to belong to the default workspace
    UPDATE documents 
    SET workspace_id = default_workspace_id 
    WHERE user_id = user_record.user_id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- Make workspace_id NOT NULL after migration
ALTER TABLE documents ALTER COLUMN workspace_id SET NOT NULL;

-- Update the updated_at trigger for workspaces
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at 
  BEFORE UPDATE ON workspaces 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
