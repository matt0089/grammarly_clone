-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add workspace_id to documents table (nullable initially for migration)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create default workspace for new users
CREATE OR REPLACE FUNCTION create_default_workspace_for_user(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_id UUID;
BEGIN
  INSERT INTO workspaces (name, description, user_id, is_default)
  VALUES ('My Workspace', 'Default workspace for your documents', user_id, TRUE)
  RETURNING id INTO workspace_id;
  
  RETURN workspace_id;
END;
$$;

-- Update the handle_new_user function to create default workspace
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Create default workspace
  workspace_id := create_default_workspace_for_user(NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error creating profile/workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Add trigger for workspace updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default workspaces for existing users
DO $$
DECLARE
  user_record RECORD;
  workspace_id UUID;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    -- Check if user already has a default workspace
    SELECT id INTO workspace_id FROM workspaces 
    WHERE user_id = user_record.id AND is_default = TRUE;
    
    -- If no default workspace exists, create one
    IF workspace_id IS NULL THEN
      workspace_id := create_default_workspace_for_user(user_record.id);
      
      -- Update all existing documents for this user to belong to the default workspace
      UPDATE documents 
      SET workspace_id = workspace_id 
      WHERE user_id = user_record.id AND workspace_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- Make workspace_id NOT NULL after migration
ALTER TABLE documents ALTER COLUMN workspace_id SET NOT NULL;

-- Update documents RLS policies to include workspace verification
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can create own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

CREATE POLICY "Users can view documents in own workspaces" ON documents
  FOR SELECT USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create documents in own workspaces" ON documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update documents in own workspaces" ON documents
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete documents in own workspaces" ON documents
  FOR DELETE USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user_default ON workspaces(user_id, is_default);
