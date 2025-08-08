import useSWR from 'swr'

export interface Invitation {
  id: string
  tenant_id: string
  email: string
  role: 'CEO' | 'Admin' | 'Manager'
  area_id?: string
  status: 'sent' | 'accepted' | 'expired' | 'cancelled' | 'pending'
  custom_message?: string
  sent_by: string
  token: string
  expires_at: string
  accepted_at?: string
  accepted_by?: string
  last_reminder_sent?: string
  reminder_count: number
  created_at: string
  updated_at: string
  sender?: {
    id: string
    full_name: string
    email: string
  }
  area?: {
    id: string
    name: string
  }
}

interface InvitationsResponse {
  invitations: Invitation[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  statistics: {
    total: number
    sent: number
    accepted: number
    expired: number
    cancelled: number
    pending: number
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch invitations')
  }
  
  return response.json()
}

interface UseInvitationsOptions {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export function useInvitations(options: UseInvitationsOptions = {}) {
  const { page = 1, limit = 50, status = '', search = '' } = options
  
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  if (status) params.append('status', status)
  if (search) params.append('search', search)
  
  const { data, error, isLoading, mutate } = useSWR<InvitationsResponse>(
    `/api/org-admin/invitations?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  )

  return {
    invitations: data?.invitations || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0
    },
    statistics: data?.statistics || {
      total: 0,
      sent: 0,
      accepted: 0,
      expired: 0,
      cancelled: 0,
      pending: 0
    },
    error,
    isLoading,
    mutate
  }
}

// Function to create an invitation
export async function createInvitation(data: {
  email: string
  role: 'CEO' | 'Admin' | 'Manager'
  area_id?: string | null
  custom_message?: string
}) {
  const response = await fetch('/api/org-admin/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create invitation')
  }
  
  return response.json()
}

// Function to update an invitation
export async function updateInvitation(id: string, data: {
  status?: 'sent' | 'cancelled'
  custom_message?: string
}) {
  const response = await fetch('/api/org-admin/invitations', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ id, ...data })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update invitation')
  }
  
  return response.json()
}

// Function to cancel an invitation
export async function cancelInvitation(id: string) {
  const response = await fetch(`/api/org-admin/invitations?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel invitation')
  }
  
  return response.json()
}

// Function to resend an invitation
export async function resendInvitation(id: string) {
  // This would trigger an email resend
  // For now, we'll just update the last_reminder_sent timestamp
  const response = await fetch(`/api/org-admin/invitations/resend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ id })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to resend invitation')
  }
  
  return response.json()
}