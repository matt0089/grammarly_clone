/**
 * @file app/api/generate-doc/route.ts
 * @description API route for generating documentation for a function.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceGithubDetails } from '@/lib/workspace-service';
import { getFunctionLocation } from '@/lib/indexing-service';
import { getRawFileContent } from '@/lib/github-service';
import { generateFunctionDocumentationStream } from '@/lib/ai.server';

/**
 * @description Handles POST requests to generate function documentation.
 * @param {NextRequest} req - The request object.
 * @returns {Promise<Response>} The response.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { workspaceId, functionName, documentType } = await req.json();

    if (!workspaceId || !functionName || !documentType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = createClient();
    const { github_repo_url, git_commit_sha } = await getWorkspaceGithubDetails(supabase, workspaceId);

    const filePath = await getFunctionLocation(workspaceId, functionName);

    const fileContent = await getRawFileContent(github_repo_url, git_commit_sha, filePath);

    const stream = await generateFunctionDocumentationStream(
      functionName,
      fileContent,
      documentType
    );

    return new Response(stream);

  } catch (error) {
    console.error('Error generating document:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
} 