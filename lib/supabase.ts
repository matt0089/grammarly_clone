/**
 * @file This file contains the client-side Supabase client setup.
 * It provides a singleton instance of the Supabase client for use in
 * client components throughout the application.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Creates and exports a singleton Supabase client instance for use in the browser.
 * This client is configured using environment variables and is essential for
 * client-side interactions with the Supabase backend.
 *
 * It uses `createBrowserClient` from `@supabase/ssr` to ensure proper handling
 * of authentication cookies, making it compatible with server-side rendering
 * and middleware in Next.js.
 */
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
