"use client";

import { useAreaDisplay } from './ManagerAreaProvider';
import { useManagerContext } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';

interface ManagerHeaderProps {
  className?: string;
}

/**
 * ManagerHeader Component
 * 
 * Features:
 * - Area identification with real-time status
 * - Manager profile dropdown with actions
 * - Notifications indicator
 * - Glassmorphism design integration
 * - Responsive design for mobile/desktop
 */
export function ManagerHeader({ className = '' }: ManagerHeaderProps) {
  const { displayName, description, isActive, loading, error } = useAreaDisplay();
  const { userProfile, isManager } = useManagerContext();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'MG';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={`
      sticky top-0 z-40 w-full
      bg-gradient-to-r from-background/95 via-background/90 to-background/95
      backdrop-blur-md border-b border-border/50
      supports-[backdrop-filter]:bg-background/60
      ${className}
    `}>
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Area Information */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-foreground">
                {loading ? 'Loading...' : displayName}
              </h1>
              {!loading && (
                <Badge 
                  variant={isActive ? "default" : "secondary"}
                  className={`
                    ${isActive 
                      ? 'bg-green-500/20 text-green-700 border-green-500/30' 
                      : 'bg-orange-500/20 text-orange-700 border-orange-500/30'
                    }
                    backdrop-blur-sm
                  `}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
            {!loading && description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {description}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative hover:bg-accent/50 backdrop-blur-sm"
          >
            <Bell className="h-4 w-4" />
            {/* Notification indicator - TODO: Connect to real notifications */}
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
          </Button>

          {/* Manager Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 hover:bg-accent/50 backdrop-blur-sm"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={userProfile?.avatar_url || undefined} 
                    alt={userProfile?.full_name || 'Manager'} 
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(userProfile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {userProfile?.full_name || 'Manager'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isManager ? 'Area Manager' : 'User'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-card/95 backdrop-blur-md border-border/50"
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {userProfile?.full_name || 'Manager'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.email}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="hover:bg-accent/50">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-accent/50">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}