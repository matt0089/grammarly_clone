/**
 * @file This file contains the client-side Supabase client setup.
 * It provides a singleton Supabase client instance for use in client components.
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../database.types';

/**
 * Creates a new Supabase client instance for client-side usage in the browser.
 * This function should be called once and the client reused across the application.
 *
 * @returns A Supabase client instance configured for browser environments.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
} 