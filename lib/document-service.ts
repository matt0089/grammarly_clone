/**
 * @file This file contains the document service, which is responsible for
 * all database interactions related to documents. It provides functions
 * for fetching and managing documents within a specific workspace.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * Define the Document type based on the 'documents' table schema.
 */
export type Document = Database['public']['Tables']['documents']['Row'];

/**
 * Fetches all documents within a specific workspace.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {string} workspaceId - The ID of the workspace.
 * @returns {Promise<Document[]>} A promise that resolves to an array of documents.
 * @throws Will throw an error if the database query fails.
 */
export async function getDocuments(
  client: SupabaseClient<Database>,
  workspaceId: string
): Promise<Document[]> {
  const { data, error } = await client
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Could not fetch documents.');
  }

  return data || [];
}

/**
 * Fetches a single document by its ID, ensuring it belongs to the specified workspace.
 *
 * @param {SupabaseClient<Database>} client - The Supabase client instance.
 * @param {string} documentId - The ID of the document to fetch.
 * @param {string} workspaceId - The ID of the workspace the document belongs to.
 * @returns {Promise<Document | null>} A promise that resolves to the document or null if not found.
 * @throws Will throw an error if the database query fails.
 */
export async function getDocument(
  client: SupabaseClient<Database>,
  documentId: string,
  workspaceId: string
): Promise<Document | null> {
  const { data, error } = await client
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // PostgREST error code for "Not a single row was returned"
      return null;
    }
    console.error('Error fetching document:', error);
    throw new Error('Could not fetch document.');
  }

  return data;
} 