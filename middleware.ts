/**
 * @file This file contains the middleware for the application.
 * It handles request processing, such as authentication checks,
 * session refreshing, and routing logic before a page is rendered.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

/**
 * The middleware function that processes incoming requests.
 * It is responsible for refreshing the user's session and then
 * calling the authentication middleware to handle routing.
 *
 * @param {NextRequest} request - The incoming HTTP request.
 * @returns {Promise<NextResponse>} The response to be sent to the client.
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  await supabase.auth.getSession();

  return authMiddleware(request, response);
}

/**
 * Handles authentication-based routing logic.
 * - Redirects unauthenticated users trying to access protected routes to the home page.
 * - Redirects authenticated users from the home page to the dashboard.
 *
 * @param {NextRequest} request - The incoming HTTP request.
 * @param {NextResponse} response - The response object from the Supabase client.
 * @returns {NextResponse} The final response after applying auth logic.
 */
function authMiddleware(request: NextRequest, response: NextResponse): NextResponse {
  const { pathname } = request.nextUrl;
  
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF_ID;
  if (!projectId) {
    console.error("Supabase project reference ID is not set in environment variables. Cannot check auth status.");
    // Allow request to pass without auth checks if the project ref is missing.
    return response;
  }
  const sessionCookieName = `sb-${projectId}-auth-token`;
  const sessionCookie = request.cookies.get(sessionCookieName);

  const isAuthenticated = sessionCookie !== undefined;

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/workspace'];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // If trying to access a protected route without being authenticated, redirect to home
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If authenticated and on the home page, redirect to the dashboard
  if (isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

/**
 * Configuration for the middleware.
 * Specifies which paths the middleware should run on.
 * We use a negative lookahead to exclude asset paths like _next/static, _next/image, and favicon.ico.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}; 