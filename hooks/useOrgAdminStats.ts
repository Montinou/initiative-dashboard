import useSWR from 'swr'

interface OrgAdminStats {
  totalUsers: number
  activeUsers: number
  pendingInvitations: number
  totalAreas: number
  activeAreas: number
  totalObjectives: number
  completedObjectives: number
  overdueObjectives: number
  unassignedUsers: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch org admin stats')
  }
  
  return response.json()
}

export function useOrgAdminStats() {
  const { data, error, isLoading, mutate } = useSWR<OrgAdminStats>(
    '/api/org-admin/stats',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000 // Refresh every 30 seconds
    }
  )

  return {
    stats: data,
    error,
    isLoading,
    mutate
  }
}