import { NextResponse } from 'next/server';
import { runIndexingJob } from '@/lib/indexing-service';

export async function POST(request: Request) {
  const { workspaceId } = await request.json();

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
  }

  // We don't await this, so the job runs in the background
  runIndexingJob(workspaceId);

  return NextResponse.json({ message: 'Indexing job started' });
} 