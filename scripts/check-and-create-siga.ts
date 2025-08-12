import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config()

async function checkAndCreateSiga() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  try {
    // Check existing tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
    
    console.log('🏢 Tenants existentes:', tenants)
    
    // Check if SIGA exists
    const sigaTenant = tenants?.find(t => t.subdomain === 'siga')
    
    if (sigaTenant) {
      console.log('✅ SIGA tenant encontrado:', sigaTenant.id)
      return sigaTenant.id
    }
    
    // Check organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
    
    console.log('🏛️ Organizaciones existentes:', orgs)
    
    // Create SIGA organization if needed
    let sigaOrgId = orgs?.find(o => o.name.includes('SIGA'))?.id
    
    if (!sigaOrgId) {
      console.log('🏛️ Creando organización SIGA...')
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'SIGA Turismo',
          description: 'Empresa de turismo y experiencias de viaje',
          subdomain: 'siga',
          industry: 'Turismo',
          company_size: '50-200',
          primary_color: '#3B82F6',
          secondary_color: '#8B5CF6'
        })
        .select()
        .single()
      
      sigaOrgId = newOrg?.id
      console.log('✅ Organización SIGA creada:', sigaOrgId)
    }
    
    // Create SIGA tenant
    console.log('🏢 Creando tenant SIGA...')
    const { data: newTenant } = await supabase
      .from('tenants')
      .insert({
        organization_id: sigaOrgId,
        subdomain: 'siga'
      })
      .select()
      .single()
    
    console.log('✅ Tenant SIGA creado:', newTenant?.id)
    
    // Create SIGA CEO user if needed
    const { data: users } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('tenant_id', newTenant?.id)
    
    if (!users || users.length === 0) {
      console.log('👤 Creando usuario CEO para SIGA...')
      
      // First create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'ceo@siga-turismo.com',
        password: 'demo123456',
        email_confirm: true
      })
      
      if (authError) {
        console.warn('⚠️ Error creando auth user:', authError)
      }
      
      // Create user profile
      const { data: newUserProfile } = await supabase
        .from('user_profiles')
        .insert({
          tenant_id: newTenant?.id,
          email: 'ceo@siga-turismo.com',
          full_name: 'CEO SIGA Turismo',
          role: 'CEO',
          user_id: authUser?.user?.id,
          is_active: true
        })
        .select()
        .single()
      
      console.log('✅ Usuario CEO creado:', newUserProfile?.id)
    }
    
    return newTenant?.id
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

checkAndCreateSiga().then(id => {
  console.log('🎯 Tenant SIGA ID:', id)
}).catch(console.error)