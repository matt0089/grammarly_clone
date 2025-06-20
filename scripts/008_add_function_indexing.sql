-- Add indexing_status to workspaces table
ALTER TABLE workspaces
ADD COLUMN indexing_status TEXT DEFAULT 'PENDING';

-- Create function_declarations table
CREATE TABLE function_declarations (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    function_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
); 