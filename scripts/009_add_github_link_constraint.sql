ALTER TABLE workspaces
ADD CONSTRAINT github_fields_check CHECK (
  (github_repo_url IS NULL AND git_commit_sha IS NULL) OR
  (github_repo_url IS NOT NULL AND git_commit_sha IS NOT NULL)
); 