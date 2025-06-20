/**
 * @file This file contains the UserProfile component, which is responsible
 * for displaying the user's avatar and email address on the dashboard.
 */

import React from 'react';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The properties for the UserProfile component.
 *
 * @property {User} user - The Supabase user object containing profile information.
 */
interface UserProfileProps {
  user: User;
}

/**
 * A component to display user profile information in a card format.
 * It shows the user's avatar and their email.
 *
 * @param {UserProfileProps} props - The properties for the component.
 * @returns {JSX.Element} The rendered user profile card.
 */
export default function UserProfile({ user }: UserProfileProps) {
  // Extract user metadata, providing fallbacks for missing data.
  const avatarUrl = user.user_metadata?.avatar_url;
  const userEmail = user.email || 'No email provided';
  const fallbackInitial = user.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center space-x-4">
        <Avatar>
          <AvatarImage src={avatarUrl} alt="User avatar" />
          <AvatarFallback>{fallbackInitial}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium leading-none">
            {user.user_metadata?.full_name || 'User'}
          </p>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
      </CardContent>
    </Card>
  );
} 