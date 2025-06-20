-- Migration script to handle existing documents without workspace_id

-- First, create default workspaces for existing users who don't have any
INSERT INTO workspaces (name, description, user_id, is_default)
SELECT 
  'My Documents' as name,
  'Default workspace for your documents' as description,
  p.id as user_id,
  true as is_default
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.user_id = p.id
);

-- Update existing documents to belong to their user's default workspace
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
ALTER TABLE documents ALTER COLUMN workspace_id SET NOT NULL;
