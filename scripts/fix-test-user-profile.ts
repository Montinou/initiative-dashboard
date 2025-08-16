import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function fixTestUserProfile() {
  console.log('🔧 Fixing test user profile...')
  
  // The user ID from the logs
  const userId = '08ab3a7b-f329-475d-ab08-65bf554252d2'
  
  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (existingProfile) {
    console.log('✅ Profile already exists:', existingProfile)
    return
  }
  
  // Create profile for SIGA tenant
  const { data: newProfile, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      email: 'test@siga.com',
      full_name: 'Test User',
      role: 'CEO',
      tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // SIGA tenant
      is_active: true,
      is_system_admin: false
    })
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error creating profile:', error)
  } else {
    console.log('✅ Profile created successfully:', newProfile)
  }
}

fixTestUserProfile().catch(console.error)