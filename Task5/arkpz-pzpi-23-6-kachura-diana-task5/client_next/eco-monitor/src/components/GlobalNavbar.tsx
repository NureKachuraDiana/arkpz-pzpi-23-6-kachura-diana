'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {Navbar as LandingNavbar} from '@/components/landing/NavBar'
import { Navbar as AuthenticatedNavbar } from '@/components/navbar';
import type { Notification } from '@/components/navbar/NotificationsDropdown';

const publicPaths = ['/login', '/signup', '/registration'];

export function GlobalNavbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  // Hide navbar on login/signup pages
  if (publicPaths.includes(pathname)) {
    return null;
  }

  // During loading, show nothing to avoid hydration mismatch
  if (isLoading) {
    return null;
  }

  // Show authenticated navbar if user is logged in (check this first, even during loading)
  if (isAuthenticated && user) {
    // TODO: Fetch real notifications from API
    const notifications: Notification[] = [];

    const handleMarkAsRead = async (id: string) => {
      try {
        // await apiService.markNotificationsAsRead({ notificationIds: [id] });
        // Refresh notifications
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    };

    const handleAcceptRequest = (id: string) => {
      // TODO: Implement request acceptance
      console.log('Accept request:', id);
    };

    const handleDeclineRequest = (id: string) => {
      // TODO: Implement request decline
      console.log('Decline request:', id);
    };

    const handleLanguageChange = (lang: 'en' | 'ua') => {
      // Language change is handled by LanguageContext
      // This callback is optional and can be used for additional side effects if needed
    };

    return (
      <AuthenticatedNavbar
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onLanguageChange={handleLanguageChange}
        onLogout={logout}
      />
    );
  }

  // Show landing navbar for unauthenticated users (including during initial loading)
  // This ensures Sign Up button is always visible for unauthenticated users
  return <LandingNavbar />;
}

