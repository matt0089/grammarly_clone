/**
 * @file This file defines the API routes for managing workspaces.
 * It includes handlers for fetching all workspaces for a user (GET)
 * and creating a new workspace (POST).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaces, createWorkspace } from '@/lib/workspace-service';

/**
 * Handles GET requests to fetch all workspaces for the authenticated user.
 *
 * @param {Request} request - The incoming HTTP request.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await getWorkspaces(supabase, user.id);
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error('Error in GET /api/workspaces:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch workspaces', details: errorMessage }, { status: 500 });
  }
}

/**
 * Handles POST requests to create a new workspace for the authenticated user.
 *
 * @param {Request} request - The incoming HTTP request, expected to have a 'name' in the body.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, github_repo_url, git_commit_sha } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const newWorkspace = await createWorkspace(supabase, {
      name,
      userId: user.id,
      github_repo_url,
      git_commit_sha,
    });
    return NextResponse.json(newWorkspace, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/workspaces:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to create workspace', details: errorMessage }, { status: 500 });
  }
} 