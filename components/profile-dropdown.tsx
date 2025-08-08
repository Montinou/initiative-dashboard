'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { useProfile, useUserRole } from '@/lib/profile-context'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ProfileDropdownProps {
  userProfile?: {
    name: string
    avatar_url?: string
    role: string
  }
  showName?: boolean
}

export function ProfileDropdown({ userProfile, showName = true }: ProfileDropdownProps) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { profile, loading, error } = useProfile()
  const userRole = useUserRole()

  // Get effective profile data (context only - no localStorage for security)
  const effectiveProfile = userProfile || profile
  const effectiveRole = userProfile?.role || userRole

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
      await supabase.auth.signOut()
      router.push('/auth/login')
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
          "flex items-center backdrop-blur-sm bg-white/10 rounded-full hover:bg-white/20 transition-colors",
          showName ? "space-x-2 px-2 lg:px-3 py-1" : "p-1.5"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-cyan-400 p-0.5 flex-shrink-0",
          showName ? "w-6 h-6 lg:w-8 lg:h-8" : "w-8 h-8"
        )}>
          <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            {(userProfile?.avatar_url || effectiveProfile?.avatar_url) ? (
              <img 
                src={userProfile?.avatar_url || effectiveProfile?.avatar_url || ''} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className={cn(
                "text-white",
                showName ? "h-3 w-3 lg:h-4 lg:w-4" : "h-4 w-4"
              )} />
            )}
          </div>
        </div>
        
        {/* Name and Role */}
        {showName && (
          <div className="hidden sm:block text-left">
            <div className="text-xs lg:text-sm text-white font-medium">
              {getDisplayName()}
            </div>
            <div className="text-xs text-white/60">
              {userProfile?.role || effectiveRole || 'Member'}
            </div>
          </div>
        )}
        
        {/* Status Indicator and Dropdown Icon - only show when expanded */}
        {showName && (
          <>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
        
        {/* Status Indicator for collapsed state - positioned absolutely */}
        {!showName && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white/20"></div>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-2 w-64 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden",
          showName ? "right-0" : "right-0 lg:left-0"
        )}>
          {/* User Info Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-cyan-400 p-0.5">
                <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                  {(userProfile?.avatar_url || effectiveProfile?.avatar_url) ? (
                    <img 
                      src={userProfile?.avatar_url || effectiveProfile?.avatar_url || ''} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserCircle2 className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
              <div>
                <div className="text-white font-medium">{getDisplayName()}</div>
                <div className="text-white/60 text-sm">{userProfile?.role || effectiveRole || 'Member'}</div>
                <div className="text-white/50 text-xs">{getDisplayEmail()}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link href="/profile">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center px-4 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <User className="h-4 w-4 mr-3" />
                <span>My Profile</span>
              </button>
            </Link>

            {canAccessCompanyProfile && (
              <>
                <Link href="/profile/company">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center px-4 py-3 text-white hover:bg-white/10 transition-colors"
                  >
                    <Building2 className="h-4 w-4 mr-3" />
                    <span>Company Profile</span>
                  </button>
                </Link>
                
                <Link href="/org-admin">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center px-4 py-3 text-white hover:bg-white/10 transition-colors"
                  >
                    <Shield className="h-4 w-4 mr-3" />
                    <span>Org Admin</span>
                  </button>
                </Link>
              </>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center px-4 py-3 text-white hover:bg-white/10 transition-colors"
            >
              <Settings className="h-4 w-4 mr-3" />
              <span>Settings</span>
            </button>

            <hr className="border-white/10 my-2" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}