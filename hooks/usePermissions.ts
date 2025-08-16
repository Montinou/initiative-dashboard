'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from './useAuth'

export type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Analyst'

export interface UserProfile {
  id: string
  user_id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: UserRole
  area_id: string | null
  avatar_url?: string | null
  phone?: string | null
  is_active?: boolean
  is_system_admin?: boolean
  last_login?: string | null
  created_at: string
  updated_at: string
}

// Permission definitions
const PERMISSIONS = {
  // Dashboard permissions
  viewAllDashboards: ['CEO', 'Admin'],
  viewAnalytics: ['CEO', 'Admin', 'Analyst'],
  viewManagerDashboard: ['Manager'],
  
  // Area permissions
  manageAllAreas: ['CEO', 'Admin'],
  viewAllAreas: ['CEO', 'Admin', 'Analyst'],
  manageOwnArea: ['Manager'],
  
  // Initiative permissions
  createInitiatives: ['CEO', 'Admin', 'Manager'],
  editAllInitiatives: ['CEO', 'Admin'],
  editOwnInitiatives: ['Manager'],
  deleteInitiatives: ['CEO', 'Admin'],
  viewAllInitiatives: ['CEO', 'Admin', 'Analyst'],
  viewOwnInitiatives: ['Manager'],
  
  // Objective permissions
  manageObjectives: ['CEO', 'Admin'],
  viewObjectives: ['CEO', 'Admin', 'Manager', 'Analyst'],
  
  // Activity permissions
  manageAllActivities: ['CEO', 'Admin'],
  manageOwnActivities: ['Manager'],
  assignActivities: ['CEO', 'Admin', 'Manager'],
  
  // Progress permissions
  updateAllProgress: ['CEO', 'Admin'],
  updateOwnProgress: ['Manager'],
  viewProgress: ['CEO', 'Admin', 'Manager', 'Analyst'],
  
  // User management permissions
  manageUsers: ['CEO', 'Admin'],
  inviteUsers: ['CEO', 'Admin'],
  viewUsers: ['CEO', 'Admin', 'Manager'],
  
  // Settings permissions
  manageOrganization: ['CEO', 'Admin'],
  manageSettings: ['CEO', 'Admin'],
  
  // File permissions
  uploadFiles: ['CEO', 'Admin', 'Manager'],
  deleteFiles: ['CEO', 'Admin'],
  viewAllFiles: ['CEO', 'Admin'],
  viewOwnFiles: ['Manager'],
  
  // Audit permissions
  viewAuditLog: ['CEO', 'Admin'],
  exportData: ['CEO', 'Admin', 'Analyst']
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Hook for managing user permissions and role-based access control
 */
export function usePermissions() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Fetch user profile
  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (error) throw error
        
        setProfile(data as UserProfile)
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [user, supabase])
  
  // Check if user has a specific permission
  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!profile) return false
      
      const allowedRoles = PERMISSIONS[permission]
      return allowedRoles.includes(profile.role)
    }
  }, [profile])
  
  // Check if user can access a specific area
  const canAccessArea = useMemo(() => {
    return (areaId: string): boolean => {
      if (!profile) return false
      
      // CEO and Admin can access all areas
      if (['CEO', 'Admin'].includes(profile.role)) {
        return true
      }
      
      // Analyst can view all areas
      if (profile.role === 'Analyst') {
        return true
      }
      
      // Manager can only access their own area
      if (profile.role === 'Manager') {
        return profile.area_id === areaId
      }
      
      return false
    }
  }, [profile])
  
  // Check if user can edit a specific resource
  const canEdit = useMemo(() => {
    return (resourceType: 'initiative' | 'activity' | 'objective', resourceAreaId?: string): boolean => {
      if (!profile) return false
      
      // CEO and Admin can edit everything
      if (['CEO', 'Admin'].includes(profile.role)) {
        return true
      }
      
      // Managers can edit resources in their area
      if (profile.role === 'Manager' && resourceAreaId) {
        return profile.area_id === resourceAreaId
      }
      
      // Analysts cannot edit
      if (profile.role === 'Analyst') {
        return false
      }
      
      return false
    }
  }, [profile])
  
  // Get list of areas user can access
  const getAccessibleAreas = useMemo(() => {
    return async (): Promise<string[]> => {
      if (!profile) return []
      
      // CEO, Admin, and Analyst can access all areas
      if (['CEO', 'Admin', 'Analyst'].includes(profile.role)) {
        const { data, error } = await supabase
          .from('areas')
          .select('id')
          
        
        if (error) {
          console.error('Error fetching areas:', error)
          return []
        }
        
        return data.map(area => area.id)
      }
      
      // Manager can only access their own area
      if (profile.role === 'Manager' && profile.area_id) {
        return [profile.area_id]
      }
      
      return []
    }
  }, [profile, supabase])
  
  // Check multiple permissions at once
  const hasAnyPermission = useMemo(() => {
    return (...permissions: Permission[]): boolean => {
      return permissions.some(permission => hasPermission(permission))
    }
  }, [hasPermission])
  
  const hasAllPermissions = useMemo(() => {
    return (...permissions: Permission[]): boolean => {
      return permissions.every(permission => hasPermission(permission))
    }
  }, [hasPermission])
  
  // Role-specific checks
  const isCEO = profile?.role === 'CEO'
  const isAdmin = profile?.role === 'Admin'
  const isManager = profile?.role === 'Manager'
  const isAnalyst = profile?.role === 'Analyst'
  const isSystemAdmin = profile?.is_system_admin === true
  
  // Composite role checks
  const isLeadership = isCEO || isAdmin
  const canManage = isCEO || isAdmin || isManager
  const isReadOnly = isAnalyst
  
  return {
    profile,
    loading,
    error,
    
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Access checks
    canAccessArea,
    canEdit,
    getAccessibleAreas,
    
    // Role checks
    isCEO,
    isAdmin,
    isManager,
    isAnalyst,
    isSystemAdmin,
    isLeadership,
    canManage,
    isReadOnly,
    
    // User info
    userId: profile?.user_id ?? null,
    tenantId: profile?.tenant_id ?? null,
    areaId: profile?.area_id ?? null,
    role: profile?.role ?? null,
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null
  }
}