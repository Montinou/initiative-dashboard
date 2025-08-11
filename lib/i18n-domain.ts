// Domain value mappers for translating enums and database values to UI labels

type TranslationFunction = (key: string) => string

// Status mapper
export function getStatusLabel(status: string, t: TranslationFunction): string {
  const statusMap: Record<string, string> = {
    'planning': 'dashboard.status.planning',
    'in_progress': 'dashboard.status.in_progress',
    'completed': 'dashboard.status.completed',
    'on_hold': 'dashboard.status.on_hold',
    'overdue': 'dashboard.status.overdue'
  }
  
  return t(statusMap[status] || status)
}

// Priority mapper
export function getPriorityLabel(priority: string, t: TranslationFunction): string {
  const priorityMap: Record<string, string> = {
    'high': 'dashboard.priority.high',
    'medium': 'dashboard.priority.medium',
    'low': 'dashboard.priority.low'
  }
  
  return t(priorityMap[priority] || priority)
}

// Role mapper
export function getRoleLabel(role: string, t: TranslationFunction): string {
  const roleMap: Record<string, string> = {
    'CEO': 'auth.roles.CEO',
    'Admin': 'auth.roles.Admin',
    'Manager': 'auth.roles.Manager'
  }
  
  return t(roleMap[role] || role)
}

// Quarter mapper
export function getQuarterLabel(quarter: string, t: TranslationFunction): string {
  const quarterMap: Record<string, string> = {
    'Q1': 'dashboard.quarters.Q1',
    'Q2': 'dashboard.quarters.Q2',
    'Q3': 'dashboard.quarters.Q3',
    'Q4': 'dashboard.quarters.Q4'
  }
  
  return t(quarterMap[quarter] || quarter)
}

// Invitation status mapper
export function getInvitationStatusLabel(status: string, t: TranslationFunction): string {
  const statusMap: Record<string, string> = {
    'sent': 'invitations.status.sent',
    'accepted': 'invitations.status.accepted',
    'expired': 'invitations.status.expired',
    'cancelled': 'invitations.status.cancelled'
  }
  
  return t(statusMap[status] || status)
}

// Activity status mapper
export function getActivityStatusLabel(isCompleted: boolean, t: TranslationFunction): string {
  return isCompleted ? t('activities.completed') : t('activities.pending')
}

// Generic enum mapper
export function mapEnumToLabel<T extends string>(
  value: T,
  enumMap: Record<T, string>,
  t: TranslationFunction
): string {
  return t(enumMap[value] || value)
}

// Export all mappers as a single object for convenience
export const domainMappers = {
  status: getStatusLabel,
  priority: getPriorityLabel,
  role: getRoleLabel,
  quarter: getQuarterLabel,
  invitationStatus: getInvitationStatusLabel,
  activityStatus: getActivityStatusLabel,
}

// Type-safe enum definitions
export const StatusEnum = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  OVERDUE: 'overdue'
} as const

export const PriorityEnum = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const

export const RoleEnum = {
  CEO: 'CEO',
  ADMIN: 'Admin',
  MANAGER: 'Manager'
} as const

export const QuarterEnum = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  Q4: 'Q4'
} as const

export type Status = typeof StatusEnum[keyof typeof StatusEnum]
export type Priority = typeof PriorityEnum[keyof typeof PriorityEnum]
export type Role = typeof RoleEnum[keyof typeof RoleEnum]
export type Quarter = typeof QuarterEnum[keyof typeof QuarterEnum]