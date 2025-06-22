/**
 * @file This file contains the CreateWorkspaceModal component, which provides a
 * dialog form for users to create a new workspace. It handles the form state,
 * submission, and API interaction.
 */

'use client';

import React, { useState } from 'react';
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
import { useRouter } from 'next/navigation';

/**
 * A modal component for creating a new workspace.
 *
 * @returns {React.ReactNode} The rendered modal component.
 */
export default function CreateWorkspaceModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [gitCommitSha, setGitCommitSha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isGithubPartiallyFilled =
    (githubRepoUrl && !gitCommitSha) || (!githubRepoUrl && gitCommitSha);

  /**
   * Handles the form submission to create a new workspace.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Workspace name cannot be empty.');
      return;
    }
    if (isGithubPartiallyFilled) {
      setError(
        'Please provide both a GitHub repository URL and a commit SHA, or neither.'
      );
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
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
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      // Close the modal and refresh the page to show the new workspace
      setOpen(false);
      router.refresh();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Workspace</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Give your new workspace a name. Click save when you're done.
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
          {isGithubPartiallyFilled && (
            <p className="text-yellow-500 text-sm text-center pb-4">
              You must provide both a GitHub URL and a commit SHA.
            </p>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !!isGithubPartiallyFilled}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 