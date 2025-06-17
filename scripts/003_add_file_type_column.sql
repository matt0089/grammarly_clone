-- Add file_type column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'txt';

-- Update existing documents to have default file type
UPDATE documents SET file_type = 'txt' WHERE file_type IS NULL;

-- Add comment to the column
COMMENT ON COLUMN documents.file_type IS 'Original file extension (txt, md, markdown) without the dot';
