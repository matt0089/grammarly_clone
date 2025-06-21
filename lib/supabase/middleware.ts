/**
 * @file This file provides a Supabase client specifically for use in Next.js middleware.
 * It allows for session management and authentication checks within edge functions.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '../database.types';

/**
 * Creates a Supabase client instance tailored for middleware environments.
 * It's configured to read and write cookies from the incoming request and outgoing response.
 *
 * @param {NextRequest} request - The incoming Next.js request object.
 * @returns {{supabase: any, response: NextResponse}} An object containing the Supabase client
 *          and a new NextResponse object.
 */
export function createClient(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  return { supabase, response };
} 