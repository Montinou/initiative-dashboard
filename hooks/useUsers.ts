"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/lib/auth-context'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'CEO' | 'Admin' | 'Analyst' | 'Manager'
  area_id: string | null
  area?: { id: string; name: string } | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

interface UseUsersParams {
  search?: string
  role?: string
  area?: string
  status?: string
  includeInactive?: boolean
}

export function useUsers(params: UseUsersParams = {}) {
  const { session, profile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check for authentication from context first
      if (!session || !profile?.tenant_id) {
        console.log('useUsers: No session or tenant ID available yet')
        setUsers([])
        return
      }

      // Build query with tenant filtering
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          area_id,
          avatar_url,
          phone,
          is_active,
          last_login,
          created_at,
          updated_at,
          areas!user_profiles_area_id_fkey(
            id,
            name
          )
        `)
        .eq('tenant_id', profile.tenant_id)

      // Apply filters
      if (!params.includeInactive) {
        query = query.eq('is_active', true)
      }

      if (params.search) {
        query = query.or(`email.ilike.%${params.search}%,full_name.ilike.%${params.search}%`)
      }

      if (params.role) {
        query = query.eq('role', params.role)
      }

      if (params.area) {
        query = query.eq('area_id', params.area)
      }

      if (params.status === 'active') {
        query = query.eq('is_active', true)
      } else if (params.status === 'inactive') {
        query = query.eq('is_active', false)
      }

      // Apply role-based filtering
      if (profile.role === 'Manager' && profile.area_id) {
        // Managers can only see users in their area
        query = query.eq('area_id', profile.area_id)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Transform data to match expected format
      const transformedUsers: User[] = (data || []).map(user => ({
        ...user,
        area: user.areas || null
      }))

      setUsers(transformedUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch users'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [supabase, profile, params.search, params.role, params.area, params.status, params.includeInactive])

  const createUser = async (userData: {
    email: string
    full_name: string
    role: string
    area_id?: string
    phone?: string
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available')
      }

      // Validate area access for managers
      if (profile.role === 'Manager' && userData.area_id && userData.area_id !== profile.area_id) {
        throw new Error('Managers can only create users in their own area')
      }

      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      })

      if (authError) throw authError

      // Then create the user profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          tenant_id: profile.tenant_id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role as any,
          area_id: userData.area_id,
          phone: userData.phone,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      await fetchUsers()
      return { data, error: null }
    } catch (err) {
      console.error('Error creating user:', err)
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create user') }
    }
  }

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available')
      }

      // Build update query with tenant filter
      let query = supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .eq('tenant_id', profile.tenant_id)

      // Apply area filter for managers
      if (profile.role === 'Manager' && profile.area_id) {
        query = query.eq('area_id', profile.area_id)
      }

      const { data, error } = await query.select().single()

      if (error) throw error

      await fetchUsers()
      return { data, error: null }
    } catch (err) {
      console.error('Error updating user:', err)
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update user') }
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available')
      }

      // Soft delete by setting is_active to false
      let query = supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId)
        .eq('tenant_id', profile.tenant_id)

      // Apply area filter for managers
      if (profile.role === 'Manager' && profile.area_id) {
        query = query.eq('area_id', profile.area_id)
      }

      const { error } = await query

      if (error) throw error

      await fetchUsers()
      return { error: null }
    } catch (err) {
      console.error('Error deleting user:', err)
      return { error: err instanceof Error ? err : new Error('Failed to delete user') }
    }
  }

  useEffect(() => {
    if (session?.user && profile?.tenant_id) {
      fetchUsers()
    } else if (!session?.user) {
      setLoading(false)
      setError(new Error('Not authenticated'))
    }
  }, [session?.user, profile?.tenant_id, fetchUsers])

  useEffect(() => {
    // Set up real-time subscription
    if (!profile?.tenant_id) return

    const channel = supabase.channel('users-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_profiles',
          filter: `tenant_id=eq.${profile.tenant_id}`
        }, 
        () => {
          fetchUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, profile?.tenant_id, fetchUsers])

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser
  }
}