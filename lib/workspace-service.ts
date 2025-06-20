/**
 * @file This file contains the workspace service, which is responsible
 * for all database interactions related to workspaces. It provides
 * functions for creating, reading, and deleting workspaces.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * Define the Workspace type based on the 'workspaces' table schema.
 * This provides a clear and type-safe structure for workspace data.
 */
export type Workspace = Database['public']['Tables']['workspaces']['Row'];

/**
 * Fetches all workspaces associated with a given user.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {string} userId - The ID of the user whose workspaces are to be fetched.
 * @returns {Promise<Workspace[]>} A promise that resolves to an array of workspaces.
 * @throws Will throw an error if the database query fails.
 */
export async function getWorkspaces(
  client: SupabaseClient<Database>,
  userId: string
): Promise<Workspace[]> {
  const { data, error } = await client
    .from('workspaces')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching workspaces:', error);
    throw new Error('Could not fetch workspaces.');
  }

  return data || [];
}

/**
 * Creates a new workspace for a specified user.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {{ name: string; userId: string }} params - The parameters for creating a workspace.
 * @returns {Promise<Workspace>} A promise that resolves to the newly created workspace.
 * @throws Will throw an error if the workspace creation fails.
 */
export async function createWorkspace(
  client: SupabaseClient<Database>,
  params: {
    name: string;
    userId: string;
    github_repo_url?: string;
    git_commit_sha?: string;
  }
): Promise<Workspace> {
  const { data, error } = await client
    .from('workspaces')
    .insert({
      name: params.name,
      user_id: params.userId,
      github_repo_url: params.github_repo_url,
      git_commit_sha: params.git_commit_sha,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workspace:', error);
    throw new Error('Could not create workspace.');
  }

  return data;
}

/**
 * Updates an existing workspace.
 *
 * @param client - The Supabase client instance.
 * @param params - The parameters for updating a workspace.
 * @returns A promise that resolves to the updated workspace.
 */
export async function updateWorkspace(
  client: SupabaseClient<Database>,
  params: {
    workspaceId: string;
    userId: string;
    name?: string;
    github_repo_url?: string;
    git_commit_sha?: string;
  }
): Promise<Workspace> {
  const { workspaceId, userId, ...updateData } = params;
  const { data, error } = await client
    .from('workspaces')
    .update(updateData)
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workspace:', error);
    throw new Error('Could not update workspace.');
  }

  return data;
}

/**
 * Deletes a specified workspace.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {{ workspaceId: string; userId: string }} params - The workspace ID and user ID for validation.
 * @returns {Promise<void>} A promise that resolves when the workspace is deleted.
 * @throws Will throw an error if the deletion fails.
 */
export async function deleteWorkspace(
  client: SupabaseClient<Database>,
  params: { workspaceId: string; userId: string }
): Promise<void> {
  const { error } = await client
    .from('workspaces')
    .delete()
    .eq('id', params.workspaceId)
    .eq('user_id', params.userId); // Ensure user owns the workspace

  if (error) {
    console.error('Error deleting workspace:', error);
    throw new Error('Could not delete workspace.');
  }
}

/**
 * Fetches a single workspace by its ID, ensuring it belongs to the user.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {{ workspaceId: string; userId: string }} params - The workspace ID and user ID.
 * @returns {Promise<Workspace>} A promise that resolves to the requested workspace.
 * @throws Will throw an error if the workspace is not found or the query fails.
 */
export async function getWorkspace(
  client: SupabaseClient<Database>,
  params: { workspaceId: string; userId: string }
): Promise<Workspace> {
  const { data, error } = await client
    .from('workspaces')
    .select('*')
    .eq('id', params.workspaceId)
    .eq('user_id', params.userId)
    .single();

  if (error || !data) {
    console.error('Error fetching workspace:', error);
    throw new Error('Could not fetch workspace.');
  }

  return data;
}

/**
 * Fetches the GitHub details for a given workspace.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {string} workspaceId - The ID of the workspace.
 * @returns {Promise<{ github_repo_url: string; git_commit_sha: string; }>} A promise that resolves to the workspace's GitHub details.
 * @throws Will throw an error if the workspace is not found or does not have GitHub details.
 */
export async function getWorkspaceGithubDetails(
  client: SupabaseClient<Database>,
  workspaceId: string
): Promise<{ github_repo_url: string; git_commit_sha: string; }> {
  const { data, error } = await client
    .from('workspaces')
    .select('github_repo_url, git_commit_sha')
    .eq('id', workspaceId)
    .single();

  if (error || !data || !data.github_repo_url || !data.git_commit_sha) {
    console.error('Error fetching workspace GitHub details:', error);
    throw new Error('Could not fetch workspace GitHub details or details are missing.');
  }

  return {
    github_repo_url: data.github_repo_url,
    git_commit_sha: data.git_commit_sha,
  };
}
