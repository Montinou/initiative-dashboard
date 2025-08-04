'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenantId } from '@/lib/auth-context'

interface Tenant {
  id: string
  name: string
  subdomain: string
  description: string | null
  industry: string | null
  is_active: boolean
  settings: any
  created_at: string
  updated_at: string
}

export function useTenant() {
  const tenantId = useTenantId()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setTenant(null)
      setLoading(false)
      return
    }

    const fetchTenant = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single()

        if (fetchError) {
          console.error('Error fetching tenant:', fetchError)
          setError(fetchError.message)
          setTenant(null)
        } else {
          setTenant(data)
        }
      } catch (err) {
        console.error('Error in fetchTenant:', err)
        setError('Failed to fetch tenant information')
        setTenant(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTenant()
  }, [tenantId])

  return {
    tenant,
    tenantName: tenant?.name || null,
    tenantSubdomain: tenant?.subdomain || null,
    loading,
    error,
    refetch: () => {
      if (tenantId) {
        // Trigger a refetch by changing loading state
        setLoading(true)
      }
    }
  }
}