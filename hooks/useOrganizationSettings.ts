import useSWR from 'swr'

export interface OrganizationSettings {
  basic: {
    name: string
    description: string
    website?: string
    subdomain: string
    industry?: string
    size?: string
    timezone?: string
    logo_url?: string
  }
  branding: {
    primary_color: string
    secondary_color: string
    logo_url?: string
    favicon_url?: string
    custom_css?: string
  }
  security: {
    two_factor_required: boolean
    session_timeout: number
    password_policy: string
    login_attempts: number
    data_retention_days: number
  }
  advanced: {
    auto_backup: boolean
    backup_frequency: string
    audit_logging: boolean
    api_access: boolean
    custom_integrations: boolean
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
    throw new Error('Failed to fetch organization settings')
  }
  
  return response.json()
}

export function useOrganizationSettings() {
  const { data, error, isLoading, mutate } = useSWR<{ settings: OrganizationSettings }>(
    '/api/org-admin/settings',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const updateSettings = async (updates: Partial<OrganizationSettings>) => {
    const response = await fetch('/api/org-admin/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update settings')
    }
    
    const updatedSettings = await response.json()
    mutate() // Refresh data
    return updatedSettings
  }

  return {
    settings: data?.settings,
    error,
    isLoading,
    mutate,
    updateSettings
  }
}