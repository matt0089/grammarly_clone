/**
 * @file This file defines the API route for deleting a specific workspace.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteWorkspace, updateWorkspace } from '@/lib/workspace-service';
import { cookies } from 'next/headers';

/**
 * Handles DELETE requests to remove a workspace by its ID.
 *
 * @param {Request} request - The incoming HTTP request.
 * @param {{ params: { workspaceId: string } }} context - The context containing the route parameters.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = params;

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
  }

  try {
    await deleteWorkspace(supabase, { workspaceId, userId: user.id });
    return NextResponse.json({ message: 'Workspace deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error in DELETE /api/workspaces/${workspaceId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to delete workspace', details: errorMessage }, { status: 500 });
  }
}

/**
 * Handles PUT requests to update a workspace.
 * @param request - The incoming HTTP request.
 * @param params - The route parameters.
 * @returns A promise that resolves to the response.
 */
export async function PUT(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = params;
  const { name, github_repo_url, git_commit_sha } = await request.json();

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Workspace ID is required' },
      { status: 400 }
    );
  }

  try {
    const updatedWorkspace = await updateWorkspace(supabase, {
      workspaceId,
      userId: user.id,
      name,
      github_repo_url,
      git_commit_sha,
    });

    // If a GitHub repo is provided, trigger the indexing job
    if (github_repo_url && git_commit_sha) {
      // Clear any existing function declarations
      await supabase
        .from('function_declarations')
        .delete()
        .eq('workspace_id', workspaceId);

      // Set indexing status to PENDING
      await supabase
        .from('workspaces')
        .update({ indexing_status: 'PENDING' })
        .eq('id', workspaceId);

      // Asynchronously trigger the indexing job, forwarding cookies
      const url = new URL('/api/index-repository', request.url);
      fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies().toString(),
        },
        body: JSON.stringify({ workspaceId }),
      });
    }

    return NextResponse.json(updatedWorkspace, { status: 200 });
  } catch (error) {
    console.error(`Error in PUT /api/workspaces/${workspaceId}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('cannot be changed')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to update workspace', details: errorMessage },
      { status: 500 }
    );
  }
} 