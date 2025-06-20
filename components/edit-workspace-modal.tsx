/**
 * @file This file contains the EditWorkspaceModal component, which provides a
 * dialog form for users to update an existing workspace.
 */

'use client';

import React, { useState, PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Workspace } from '@/lib/workspace-service';

interface EditWorkspaceModalProps {
  workspace: Workspace;
  onUpdate: (workspace: Workspace) => void;
}

export default function EditWorkspaceModal({
  workspace,
  onUpdate,
  children,
}: PropsWithChildren<EditWorkspaceModalProps>) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [githubRepoUrl, setGithubRepoUrl] = useState(
    workspace.github_repo_url || ''
  );
  const [gitCommitSha, setGitCommitSha] = useState(
    workspace.git_commit_sha || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Workspace name cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          github_repo_url: githubRepoUrl,
          git_commit_sha: gitCommitSha,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workspace');
      }

      const updatedWorkspace = await response.json();
      onUpdate(updatedWorkspace);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update your workspace details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="My Awesome Project"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="githubRepoUrl" className="text-right">
                GitHub Repo
              </Label>
              <Input
                id="githubRepoUrl"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://github.com/user/repo"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gitCommitSha" className="text-right">
                Commit SHA
              </Label>
              <Input
                id="gitCommitSha"
                value={gitCommitSha}
                onChange={(e) => setGitCommitSha(e.target.value)}
                className="col-span-3"
                placeholder="a1b2c3d"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 