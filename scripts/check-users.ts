import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkUsers() {
  console.log('Checking users and profiles...\n')
  
  // Get all user profiles with tenant info
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select(`
      *,
      tenant:tenants!user_profiles_tenant_id_fkey (
        id,
        subdomain,
        organization:organizations!tenants_organization_id_fkey (
          id,
          name
        )
      )
    `)
    .limit(10)
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return
  }
  
  console.log(`Found ${profiles?.length || 0} user profiles:\n`)
  
  profiles?.forEach(profile => {
    console.log(`User: ${profile.full_name || 'No name'} (${profile.email})`)
    console.log(`  - Role: ${profile.role}`)
    console.log(`  - User ID: ${profile.user_id || 'NO AUTH USER LINKED'}`)
    console.log(`  - Tenant ID: ${profile.tenant_id || 'NO TENANT'}`)
    console.log(`  - Tenant: ${profile.tenant?.subdomain || 'Unknown'}`)
    console.log(`  - Organization: ${profile.tenant?.organization?.name || 'Unknown'}`)
    console.log(`  - Active: ${profile.is_active}`)
    console.log('')
  })
  
  // Check for profiles without tenant_id
  const { data: brokenProfiles } = await supabase
    .from('user_profiles')
    .select('id, email, user_id, tenant_id')
    .is('tenant_id', null)
  
  if (brokenProfiles && brokenProfiles.length > 0) {
    console.log('⚠️  WARNING: Found profiles without tenant_id:')
    brokenProfiles.forEach(p => {
      console.log(`  - ${p.email} (id: ${p.id})`)
    })
  }
  
  // Check for profiles without user_id
  const { data: unlinkedProfiles } = await supabase
    .from('user_profiles')
    .select('id, email, user_id, tenant_id')
    .is('user_id', null)
  
  if (unlinkedProfiles && unlinkedProfiles.length > 0) {
    console.log('\n⚠️  WARNING: Found profiles without auth user link:')
    unlinkedProfiles.forEach(p => {
      console.log(`  - ${p.email} (id: ${p.id})`)
    })
  }
}

checkUsers().catch(console.error)