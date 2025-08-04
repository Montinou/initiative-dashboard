import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './supabase'

export type UserRole = 'CEO' | 'Admin' | 'Analyst' | 'Manager'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  tenant_id: string
  area: string | null
}

export async function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function getServerSession(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: userData } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, tenant_id, area')
      .eq('user_id', user.id)
      .single()

    if (!userData) return null

    return userData as AuthUser
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export function canManageUsers(userRole: UserRole): boolean {
  return hasPermission(userRole, ['CEO', 'Admin'])
}

export function canManageAreas(userRole: UserRole): boolean {
  return hasPermission(userRole, ['CEO', 'Admin'])
}

export function canViewDashboard(userRole: UserRole): boolean {
  return hasPermission(userRole, ['CEO', 'Analyst'])
}

export function canManageInitiatives(userRole: UserRole): boolean {
  return hasPermission(userRole, ['CEO', 'Manager'])
}

export function canExportData(userRole: UserRole): boolean {
  return hasPermission(userRole, ['CEO', 'Analyst'])
}