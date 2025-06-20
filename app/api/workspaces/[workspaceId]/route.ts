/**
 * @file This file defines the API route for deleting a specific workspace.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteWorkspace } from '@/lib/workspace-service';

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