/**
 * User Profile Data Adapter
 * Transforms raw user profile data from Supabase for shadcn blocks consumption
 */

import { format, parseISO } from 'date-fns'

export interface RawUserProfileData {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: 'CEO' | 'Admin' | 'Manager'
  area_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  is_system_admin: boolean
  last_login: string | null
  // Relations
  area?: {
    id: string
    name: string
    description?: string
  }
  tenant?: {
    id: string
    subdomain: string
    organization?: {
      id: string
      name: string
    }
  }
}

export interface AdaptedUserProfileData {
  id: string
  email: string
  name: string
  displayName: string
  role: 'CEO' | 'Admin' | 'Manager'
  isActive: boolean
  isSystemAdmin: boolean
  avatar: string | null
  phone: string | null
  area: {
    id: string
    name: string
    description?: string
  } | null
  tenant: {
    id: string
    subdomain: string
    organizationName: string
  }
  permissions: {
    canViewAllAreas: boolean
    canEditAllAreas: boolean
    canManageUsers: boolean
    canAccessReports: boolean
    canManageSettings: boolean
    canInviteUsers: boolean
    accessibleAreaIds: string[]
  }
  activity: {
    lastLogin: Date | null
    lastLoginFormatted: string | null
    accountAge: number // days
    isNewUser: boolean
  }
  contact: {
    initials: string
    hasAvatar: boolean
    contactMethods: Array<{
      type: 'email' | 'phone'
      value: string
      primary: boolean
    }>
  }
  timestamps: {
    created: Date
    updated: Date
  }
}

export interface UserFilterOptions {
  role?: 'CEO' | 'Admin' | 'Manager'
  areaId?: string
  isActive?: boolean
  hasRecentActivity?: boolean
  lastLoginWithinDays?: number
}

export class UserProfileAdapter {
  /**
   * Transform raw user profile data to adapted format
   */
  static adapt(raw: RawUserProfileData): AdaptedUserProfileData {
    const lastLogin = raw.last_login ? parseISO(raw.last_login) : null
    const created = parseISO(raw.created_at)
    const accountAge = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 3600 * 24))
    
    const permissions = this.calculatePermissions(raw.role, raw.area_id, raw.is_system_admin)
    const displayName = this.generateDisplayName(raw.full_name, raw.email)
    const initials = this.generateInitials(displayName)

    return {
      id: raw.id,
      email: raw.email,
      name: raw.full_name || '',
      displayName,
      role: raw.role,
      isActive: raw.is_active,
      isSystemAdmin: raw.is_system_admin,
      avatar: raw.avatar_url,
      phone: raw.phone,
      area: raw.area ? {
        id: raw.area.id,
        name: raw.area.name,
        description: raw.area.description
      } : null,
      tenant: {
        id: raw.tenant_id,
        subdomain: raw.tenant?.subdomain || '',
        organizationName: raw.tenant?.organization?.name || 'Unknown Organization'
      },
      permissions,
      activity: {
        lastLogin,
        lastLoginFormatted: lastLogin ? format(lastLogin, 'MMM dd, yyyy HH:mm') : null,
        accountAge,
        isNewUser: accountAge <= 7
      },
      contact: {
        initials,
        hasAvatar: !!raw.avatar_url,
        contactMethods: this.buildContactMethods(raw.email, raw.phone)
      },
      timestamps: {
        created,
        updated: parseISO(raw.updated_at)
      }
    }
  }

  /**
   * Batch adapt multiple user profiles
   */
  static adaptMany(rawItems: RawUserProfileData[]): AdaptedUserProfileData[] {
    return rawItems.map(item => this.adapt(item))
  }

  /**
   * Filter users based on various criteria
   */
  static filter(
    users: AdaptedUserProfileData[], 
    filters: UserFilterOptions
  ): AdaptedUserProfileData[] {
    return users.filter(user => {
      if (filters.role && user.role !== filters.role) {
        return false
      }

      if (filters.areaId && user.area?.id !== filters.areaId) {
        return false
      }

      if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
        return false
      }

      if (filters.hasRecentActivity !== undefined) {
        const hasRecent = user.activity.lastLogin && 
          user.activity.lastLogin.getTime() > (Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
        if (hasRecent !== filters.hasRecentActivity) {
          return false
        }
      }

      if (filters.lastLoginWithinDays !== undefined && user.activity.lastLogin) {
        const daysSinceLogin = Math.floor(
          (Date.now() - user.activity.lastLogin.getTime()) / (1000 * 3600 * 24)
        )
        if (daysSinceLogin > filters.lastLoginWithinDays) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Group users by different criteria
   */
  static groupBy(
    users: AdaptedUserProfileData[],
    groupBy: 'role' | 'area' | 'status' | 'activity'
  ): Record<string, AdaptedUserProfileData[]> {
    const groups: Record<string, AdaptedUserProfileData[]> = {}

    users.forEach(user => {
      let key: string

      switch (groupBy) {
        case 'role':
          key = user.role
          break
        case 'area':
          key = user.area?.name || 'Unassigned'
          break
        case 'status':
          key = user.isActive ? 'Active' : 'Inactive'
          break
        case 'activity':
          if (!user.activity.lastLogin) {
            key = 'Never logged in'
          } else {
            const daysSinceLogin = Math.floor(
              (Date.now() - user.activity.lastLogin.getTime()) / (1000 * 3600 * 24)
            )
            if (daysSinceLogin <= 1) key = 'Active today'
            else if (daysSinceLogin <= 7) key = 'Active this week'
            else if (daysSinceLogin <= 30) key = 'Active this month'
            else key = 'Inactive'
          }
          break
        default:
          key = 'Other'
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(user)
    })

    return groups
  }

  /**
   * Calculate team metrics for a collection of users
   */
  static calculateTeamMetrics(users: AdaptedUserProfileData[]) {
    const total = users.length
    const active = users.filter(u => u.isActive).length
    const inactive = total - active
    
    const roleDistribution = users.reduce((dist, user) => {
      dist[user.role] = (dist[user.role] || 0) + 1
      return dist
    }, {} as Record<string, number>)

    const areaDistribution = users.reduce((dist, user) => {
      const areaName = user.area?.name || 'Unassigned'
      dist[areaName] = (dist[areaName] || 0) + 1
      return dist
    }, {} as Record<string, number>)

    const recentlyActive = users.filter(u => 
      u.activity.lastLogin && 
      u.activity.lastLogin.getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length

    const newUsers = users.filter(u => u.activity.isNewUser).length

    return {
      total,
      active,
      inactive,
      activeRate: Math.round((active / total) * 100),
      roleDistribution,
      areaDistribution,
      recentlyActive,
      newUsers,
      avgAccountAge: Math.round(
        users.reduce((sum, u) => sum + u.activity.accountAge, 0) / total
      )
    }
  }

  /**
   * Get users that need attention (inactive, no recent login, etc.)
   */
  static getUsersNeedingAttention(users: AdaptedUserProfileData[]) {
    const inactive = users.filter(u => !u.isActive)
    
    const noRecentLogin = users.filter(u => 
      u.isActive && (!u.activity.lastLogin || 
      u.activity.lastLogin.getTime() < (Date.now() - 30 * 24 * 60 * 60 * 1000))
    )

    const neverLoggedIn = users.filter(u => 
      u.isActive && !u.activity.lastLogin
    )

    const unassignedManagers = users.filter(u => 
      u.role === 'Manager' && !u.area
    )

    const incompleteProfiles = users.filter(u => 
      !u.name || !u.contact.hasAvatar
    )

    return {
      inactive,
      noRecentLogin,
      neverLoggedIn,
      unassignedManagers,
      incompleteProfiles,
      totalNeedingAttention: new Set([
        ...inactive,
        ...noRecentLogin,
        ...unassignedManagers,
        ...incompleteProfiles
      ]).size
    }
  }

  /**
   * Transform for different view formats
   */
  static transformForView(
    users: AdaptedUserProfileData[],
    viewType: 'card' | 'table' | 'list' | 'org-chart'
  ) {
    switch (viewType) {
      case 'card':
        return users.map(user => ({
          id: user.id,
          name: user.displayName,
          email: user.email,
          role: user.role,
          area: user.area?.name,
          avatar: user.avatar,
          initials: user.contact.initials,
          isActive: user.isActive,
          lastLogin: user.activity.lastLoginFormatted,
          permissions: user.permissions
        }))

      case 'table':
        return users.map(user => ({
          id: user.id,
          name: user.displayName,
          email: user.email,
          role: user.role,
          area: user.area?.name || 'Unassigned',
          status: user.isActive ? 'Active' : 'Inactive',
          lastLogin: user.activity.lastLoginFormatted || 'Never',
          accountAge: `${user.activity.accountAge} days`,
          phone: user.phone || '-',
          isNewUser: user.activity.isNewUser
        }))

      case 'list':
        return users.map(user => ({
          id: user.id,
          name: user.displayName,
          role: user.role,
          area: user.area?.name,
          avatar: user.avatar,
          initials: user.contact.initials,
          isActive: user.isActive,
          canViewDetails: true
        }))

      case 'org-chart':
        // Group by area for org chart
        const areaGroups = this.groupBy(users, 'area')
        return Object.entries(areaGroups).map(([areaName, areaUsers]) => ({
          areaName,
          manager: areaUsers.find(u => u.role === 'Manager'),
          members: areaUsers.filter(u => u.role !== 'Manager').map(user => ({
            id: user.id,
            name: user.displayName,
            role: user.role,
            avatar: user.avatar,
            initials: user.contact.initials,
            isActive: user.isActive
          }))
        }))

      default:
        return users
    }
  }

  // Private helper methods
  private static calculatePermissions(
    role: string, 
    areaId: string | null, 
    isSystemAdmin: boolean
  ) {
    const basePermissions = {
      canViewAllAreas: false,
      canEditAllAreas: false,
      canManageUsers: false,
      canAccessReports: false,
      canManageSettings: false,
      canInviteUsers: false,
      accessibleAreaIds: [] as string[]
    }

    if (isSystemAdmin) {
      return {
        ...basePermissions,
        canViewAllAreas: true,
        canEditAllAreas: true,
        canManageUsers: true,
        canAccessReports: true,
        canManageSettings: true,
        canInviteUsers: true,
        accessibleAreaIds: ['*'] // All areas
      }
    }

    switch (role) {
      case 'CEO':
        return {
          ...basePermissions,
          canViewAllAreas: true,
          canEditAllAreas: true,
          canManageUsers: true,
          canAccessReports: true,
          canManageSettings: true,
          canInviteUsers: true,
          accessibleAreaIds: ['*']
        }

      case 'Admin':
        return {
          ...basePermissions,
          canViewAllAreas: true,
          canEditAllAreas: true,
          canManageUsers: true,
          canAccessReports: true,
          canInviteUsers: true,
          accessibleAreaIds: ['*']
        }

      case 'Manager':
        return {
          ...basePermissions,
          canViewAllAreas: true,
          canEditAllAreas: false,
          canAccessReports: true,
          canInviteUsers: true,
          accessibleAreaIds: areaId ? [areaId] : []
        }

      default:
        return basePermissions
    }
  }

  private static generateDisplayName(fullName: string | null, email: string): string {
    if (fullName?.trim()) {
      return fullName.trim()
    }
    
    // Extract name from email
    const emailName = email.split('@')[0]
    return emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  private static generateInitials(displayName: string): string {
    const nameParts = displayName.trim().split(' ')
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase()
    }
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
  }

  private static buildContactMethods(email: string, phone: string | null) {
    const methods = [
      { type: 'email' as const, value: email, primary: true }
    ]

    if (phone) {
      methods.push({ type: 'phone' as const, value: phone, primary: false })
    }

    return methods
  }
}

export default UserProfileAdapter