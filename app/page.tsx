'use client';

/**
 * @file This is the root page of the application. It now serves as the main
 * authentication gateway for users.
 */

import { Auth } from '@/components/auth';

/**
 * The home page component, which renders the authentication UI.
 *
 * @returns {JSX.Element} The rendered authentication component.
 */
export default function HomePage() {
  return <Auth onAuthChange={() => {}} />;
} 