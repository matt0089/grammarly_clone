-- Add document metadata columns
ALTER TABLE documents 
ADD COLUMN document_type TEXT,
ADD COLUMN document_goal TEXT;

-- Add some sample data to existing documents (optional)
UPDATE documents 
SET document_type = 'general',
    document_goal = 'General purpose document'
WHERE document_type IS NULL;
