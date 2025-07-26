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
  UserCircle2
} from 'lucide-react'
import { useAuth, useUserRole } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface ProfileDropdownProps {
  userProfile?: {
    name: string
    avatar_url?: string
    role: string
  }
}

export function ProfileDropdown({ userProfile }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { profile } = useAuth()
  const userRole = useUserRole()

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

  const canAccessCompanyProfile = userRole && ['CEO', 'Admin'].includes(userRole)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 backdrop-blur-sm bg-white/10 rounded-full px-2 lg:px-3 py-1 hover:bg-white/20 transition-colors"
      >
        {/* Avatar */}
        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-cyan-400 p-0.5">
          <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            {userProfile?.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
            )}
          </div>
        </div>
        
        {/* Name and Role */}
        <div className="hidden sm:block text-left">
          <div className="text-xs lg:text-sm text-white font-medium">
            {userProfile?.name || 'User'}
          </div>
          <div className="text-xs text-white/60">
            {userProfile?.role || 'Member'}
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        
        {/* Dropdown Icon */}
        <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-cyan-400 p-0.5">
                <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img 
                      src={userProfile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserCircle2 className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
              <div>
                <div className="text-white font-medium">{userProfile?.name || 'User'}</div>
                <div className="text-white/60 text-sm">{userProfile?.role || 'Member'}</div>
                <div className="text-white/50 text-xs">{profile?.email}</div>
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
              <Link href="/profile/company">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center px-4 py-3 text-white hover:bg-white/10 transition-colors"
                >
                  <Building2 className="h-4 w-4 mr-3" />
                  <span>Company Profile</span>
                </button>
              </Link>
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