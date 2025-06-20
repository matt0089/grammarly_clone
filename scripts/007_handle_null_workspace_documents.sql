-- Handle documents that might not have a workspace_id
-- This ensures backward compatibility

-- First, let's make sure we have a default workspace for each user
INSERT INTO workspaces (name, description, user_id, is_default)
SELECT 
  'My Documents' as name,
  'Default workspace for your documents' as description,
  u.id as user_id,
  true as is_default
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w 
  WHERE w.user_id = u.id AND w.is_default = true
);

-- Now assign any documents without workspace_id to the user's default workspace
UPDATE documents 
SET workspace_id = (
  SELECT w.id 
  FROM workspaces w 
  WHERE w.user_id = documents.user_id 
  AND w.is_default = true 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Make workspace_id NOT NULL after migration
ALTER TABLE documents 
ALTER COLUMN workspace_id SET NOT NULL;
