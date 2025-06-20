-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add workspace_id to documents table
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

-- Update documents RLS to include workspace check
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can create own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create own documents" ON documents
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (
    auth.uid() = user_id AND 
    workspace_id IN (SELECT id FROM workspaces WHERE user_id = auth.uid())
  );

-- Add trigger for workspaces updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  VALUES ('My Documents', 'Default workspace for your documents', user_id, true)
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
