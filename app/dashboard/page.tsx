/**
 * @file This file defines the main dashboard page, which serves as the central
 * hub for users to view their profile and manage their workspaces.
 * This page will perform server-side data fetching for the user's
 * information and workspaces and pass it to client components.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UserProfile from '@/components/user-profile';
import WorkspaceList from '@/components/workspace-list';
import { getWorkspaces } from '@/lib/workspace-service';
import CreateWorkspaceModal from '@/components/create-workspace-modal';

/**
 * The main dashboard page component.
 * It ensures the user is authenticated, fetches necessary data,
 * and renders the dashboard layout.
 *
 * @returns {Promise<JSX.Element>} The rendered dashboard page.
 */
export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If the user is not authenticated, redirect them to the home page for login.
    // The home page should contain the authentication UI.
    return redirect('/');
  }

  // Fetch workspaces for the user on the server.
  const workspaces = await getWorkspaces(supabase, user.id);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left column for Profile and Actions */}
        <aside className="lg:col-span-3 space-y-8">
          <UserProfile user={user} />
        </aside>

        {/* Right column for Workspaces */}
        <main className="lg:col-span-9">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
            <CreateWorkspaceModal />
          </div>
          <WorkspaceList initialWorkspaces={workspaces} />
        </main>
      </div>
    </div>
  );
} 