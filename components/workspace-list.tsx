/**
 * @file This file contains the WorkspaceList component, which is responsible
 * for displaying a list of workspaces and providing actions like navigating
 * to a workspace or deleting it.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Workspace } from '@/lib/workspace-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EditWorkspaceModal from './edit-workspace-modal';

/**
 * Props for the WorkspaceList component.
 * @property {Workspace[]} initialWorkspaces - The initial list of workspaces to display.
 */
interface WorkspaceListProps {
  initialWorkspaces: Workspace[];
}

/**
 * A component to display and manage a list of workspaces.
 *
 * @param {WorkspaceListProps} props - The component props.
 * @returns {React.ReactNode} The rendered list of workspaces.
 */
export default function WorkspaceList({ initialWorkspaces }: WorkspaceListProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);

  useEffect(() => {
    setWorkspaces(initialWorkspaces);
  }, [initialWorkspaces]);

  /**
   * Handles the deletion of a workspace.
   * @param {string} workspaceId - The ID of the workspace to delete.
   */
  async function handleDelete(workspaceId: string) {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workspace');
      }

      // Refresh the page to reflect the deletion
      router.refresh();
    } catch (error) {
      console.error('Deletion error:', error);
      // Here you could show a toast notification to the user
    }
  }

  function handleUpdate(updatedWorkspace: Workspace) {
    setWorkspaces((prevWorkspaces) =>
      prevWorkspaces.map((ws) =>
        ws.id === updatedWorkspace.id ? updatedWorkspace : ws
      )
    );
    router.refresh();
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You don't have any workspaces yet.</p>
        <p className="text-muted-foreground">Get started by creating a new one.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace) => (
        <Card key={workspace.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{workspace.name}</CardTitle>
            <WorkspaceActions
              workspace={workspace}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Last updated: {workspace.updated_at ? new Date(workspace.updated_at).toLocaleDateString() : 'N/A'}
            </p>
            {workspace.github_repo_url && (
              <p className="text-sm text-muted-foreground truncate">
                Repo: {workspace.github_repo_url}
              </p>
            )}
            {workspace.git_commit_sha && (
              <p className="text-sm text-muted-foreground truncate">
                Commit: {workspace.git_commit_sha}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Link href={`/workspace/${workspace.id}`} passHref>
              <Button className="w-full">Open Workspace</Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

/**
 * A component for rendering the actions menu for a workspace.
 * @param {{ workspaceId: string; onDelete: (id: string) => void }} props - Component props.
 * @returns {React.ReactNode} The rendered actions menu.
 */
function WorkspaceActions({
  workspace,
  onDelete,
  onUpdate,
}: {
  workspace: Workspace;
  onDelete: (id: string) => void;
  onUpdate: (workspace: Workspace) => void;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <EditWorkspaceModal workspace={workspace} onUpdate={onUpdate}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Edit
            </DropdownMenuItem>
          </EditWorkspaceModal>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-red-600">
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            workspace and all of its documents.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(workspace.id)}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 