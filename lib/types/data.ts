/**
 * Type definitions for data structures used throughout the application
 * These types ensure type safety across all components and utilities
 */

// User and Profile types
export interface UserProfile {
  id: string
  user_id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: 'CEO' | 'Admin' | 'Manager'
  area_id: string | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  is_system_admin: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

// Area types
export interface Area {
  id: string
  tenant_id: string
  name: string
  description: string | null
  manager_id: string | null
  manager?: UserProfile
  is_active: boolean
  created_at: string
  updated_at: string
}

// Objective types
export interface Objective {
  id: string
  tenant_id: string
  area_id: string | null
  area?: Area
  area_name?: string
  title: string
  description: string | null
  created_by: string
  created_by_profile?: UserProfile
  created_by_name?: string
  priority: 'high' | 'medium' | 'low'
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  progress: number
  target_date: string | null
  metrics: Record<string, any>
  start_date: string | null
  end_date: string | null
  initiatives_count?: number
  overall_progress?: number
  is_on_track?: boolean
  initiatives?: Initiative[]
  created_at: string
  updated_at: string
}


// Initiative types
export interface Initiative {
  id: string
  tenant_id: string
  area_id: string
  area?: Area
  area_name?: string
  title: string
  name?: string // For backward compatibility
  description: string | null
  progress: number
  created_by: string
  created_by_profile?: UserProfile
  created_by_name?: string
  due_date: string | null
  target_date?: string | null // For backward compatibility
  start_date: string | null
  completion_date: string | null
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  objective_id?: string
  objective?: Objective
  objective_title?: string
  activities?: Activity[]
  activity_count?: number
  completed_activities?: number
  created_at: string
  updated_at: string
}

// Activity types
export interface Activity {
  id: string
  initiative_id: string
  initiative?: Initiative
  initiative_title?: string
  title: string
  description: string | null
  is_completed: boolean
  completed?: boolean // For backward compatibility
  assigned_to: string | null
  assigned_to_profile?: UserProfile
  assigned_to_name?: string
  days_overdue?: number
  priority?: 'high' | 'medium' | 'low'
  created_at: string
  updated_at: string
}

// Progress tracking types
export interface ProgressHistory {
  id: string
  initiative_id: string
  initiative?: Initiative
  progress_value: number
  previous_value?: number
  completed_activities_count?: number
  total_activities_count?: number
  notes: string | null
  changed_by?: string
  changed_by_profile?: UserProfile
  changed_by_name?: string
  change_notes?: string
  updated_by?: string
  changed_at?: string
  created_at: string
}

// Audit log types
export interface AuditLogEntry {
  id: string
  tenant_id?: string
  user_id: string | null
  user_profile?: UserProfile
  action: 'create' | 'update' | 'delete'
  entity_type: string
  entity_id: string | null
  table_name?: string
  record_id?: string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changes?: Record<string, { old: any; new: any }>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Dashboard statistics types
export interface DashboardStatistics {
  total_team_members?: number
  total_initiatives?: number
  total_activities?: number
  total_objectives?: number
  completed_activities?: number
  completed_initiatives?: number
  overdue_activities?: number
  average_progress?: number
  team_utilization?: number
  initiatives_at_risk?: number
  upcoming_deadlines?: number
}

// Manager dashboard types
export interface ManagerDashboardData {
  area: Area
  team_members: TeamMember[]
  initiatives: InitiativeSummary[]
  objectives: ObjectiveSummary[]
  activities: ActivitySummary[]
  statistics: DashboardStatistics
  recent_updates?: RecentUpdate[]
}

export interface TeamMember extends UserProfile {
  assigned_activities?: number
  completed_activities?: number
  active_initiatives?: number
  performance_score?: number
}

export interface InitiativeSummary extends Initiative {
  activities_count?: number
  days_remaining?: number
  is_at_risk?: boolean
  team_members_involved?: string[]
}

export interface ObjectiveSummary extends Objective {
  initiatives_count?: number
  is_on_track?: boolean
}

export interface ActivitySummary extends Activity {
  days_overdue?: number
}

export interface RecentUpdate {
  id: string
  type: 'initiative' | 'activity' | 'objective'
  title: string
  description: string
  timestamp: string
  user_name?: string
  impact?: 'high' | 'medium' | 'low'
}

// Generic data item that could be any of the main entity types
export type DataItem = Initiative | Objective | Activity | Area | UserProfile

// Helper type for items with common fields
export interface FilterableItem {
  id: string
  title?: string
  name?: string
  description?: string | null
  status?: string
  priority?: string
  progress?: number
  area_id?: string
  area?: Area
  area_name?: string
  objective_id?: string
  objective?: Objective
  objective_title?: string
  initiative_id?: string
  initiative?: Initiative
  initiative_title?: string
  assigned_to?: string | null
  assigned_to_profile?: UserProfile
  assigned_to_name?: string
  created_by?: string
  created_by_profile?: UserProfile
  created_by_name?: string
  start_date?: string | null
  end_date?: string | null
  due_date?: string | null
  target_date?: string | null
  created_at?: string
  updated_at?: string
}

// Type guards
export function isInitiative(item: DataItem): item is Initiative {
  return 'area_id' in item && 'progress' in item && 'created_by' in item
}

export function isObjective(item: DataItem): item is Objective {
  return 'priority' in item && 'metrics' in item && 'target_date' in item
}

export function isActivity(item: DataItem): item is Activity {
  return 'initiative_id' in item && 'is_completed' in item
}

export function isArea(item: DataItem): item is Area {
  return 'manager_id' in item && 'is_active' in item
}

export function isUserProfile(item: DataItem): item is UserProfile {
  return 'user_id' in item && 'role' in item && 'tenant_id' in item
}