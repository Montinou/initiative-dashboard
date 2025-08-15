'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Settings, 
  Building2, 
  LogOut, 
  ChevronDown,
  UserCircle2,
  Shield
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface ProfileDropdownProps {
  userProfile?: {
    name: string
    avatar_url?: string
    role: string
  }
  showName?: boolean
}

export function ProfileDropdown({ userProfile, showName = true }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { profile, loading, error, signOut } = useAuth()
  const t = useTranslations('profile')
  const tNav = useTranslations('navigation')

  // Get effective profile data (context only - no localStorage for security)
  const effectiveProfile = userProfile || profile
  const effectiveRole = userProfile?.role || profile?.role

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      // signOut already handles the redirect
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Helper to get display name safely
  const getDisplayName = () => {
    if (userProfile?.name) return userProfile.name
    if (profile?.full_name) return profile.full_name
    return 'User'
  }

  // Helper to get email safely  
  const getDisplayEmail = () => {
    if (profile?.email) return profile.email
    return ''
  }

  const canAccessCompanyProfile = effectiveRole && ['CEO', 'Admin'].includes(effectiveRole)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center h-10 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background/90 transition-all border border-border/50",
          showName ? "space-x-2 px-3 py-1" : "p-2"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "rounded-full overflow-hidden bg-gradient-to-r from-primary to-primary/60 p-0.5 flex-shrink-0",
          showName ? "w-7 h-7" : "w-8 h-8"
        )}>
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
            {(userProfile?.avatar_url || effectiveProfile?.avatar_url) ? (
              <img 
                src={userProfile?.avatar_url || effectiveProfile?.avatar_url || ''} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className={cn(
                "text-foreground",
                showName ? "h-4 w-4" : "h-4 w-4"
              )} />
            )}
          </div>
        </div>
        
        {/* Name and Role */}
        {showName && (
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-foreground">
              {getDisplayName()}
            </div>
            <div className="text-xs text-muted-foreground">
              {userProfile?.role || effectiveRole || (loading ? '...' : effectiveRole || '')}
            </div>
          </div>
        )}
        
        {/* Dropdown Icon */}
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180",
          !showName && "ml-1"
        )} />
        
        {/* Status Indicator - positioned absolutely */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-2 w-64 bg-popover backdrop-blur-sm border border-border rounded-lg shadow-lg z-50 overflow-hidden",
          "right-0"
        )}>
          {/* User Info Header */}
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-primary to-primary/60 p-0.5">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {(userProfile?.avatar_url || effectiveProfile?.avatar_url) ? (
                    <img 
                      src={userProfile?.avatar_url || effectiveProfile?.avatar_url || ''} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserCircle2 className="h-8 w-8 text-foreground" />
                  )}
                </div>
              </div>
              <div>
                <div className="text-foreground font-medium">{getDisplayName()}</div>
                <div className="text-muted-foreground text-sm">{userProfile?.role || effectiveRole || (loading ? '...' : effectiveRole || '')}</div>
                <div className="text-muted-foreground text-xs">{getDisplayEmail()}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link href="/profile">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center px-4 py-2.5 text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 mr-3" />
                <span>{t('title')}</span>
              </button>
            </Link>

            {canAccessCompanyProfile && (
              <>
                <Link href="/profile/company">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center px-4 py-2.5 text-foreground hover:bg-muted transition-colors"
                  >
                    <Building2 className="h-4 w-4 mr-3" />
                    <span>{t('company.title')}</span>
                  </button>
                </Link>
                
                <Link href="/org-admin">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center px-4 py-2.5 text-foreground hover:bg-muted transition-colors"
                  >
                    <Shield className="h-4 w-4 mr-3" />
                    <span>{tNav('orgAdmin')}</span>
                  </button>
                </Link>
              </>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center px-4 py-2.5 text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4 mr-3" />
              <span>{tNav('settings')}</span>
            </button>

            <hr className="border-border my-2" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2.5 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span>{tNav('signOut')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}