/**
 * Recreate Corporativo Area Script
 * 
 * Purpose:
 *   1. Create "Corporativo" area for SIGA tenant
 *   2. Assign all CEO and Admin users from SIGA to this area
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface Tenant {
  id: string
  subdomain: string
  organization?: {
    name: string
  }
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  area_id: string | null
  area?: {
    name: string
  }
}

// Helper function to prompt user
function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase())
    })
  })
}

async function findSigaTenant(): Promise<Tenant | null> {
  console.log('\n🔍 Finding SIGA tenant...')
  
  // First try by subdomain
  const { data: tenantBySubdomain, error: subdomainError } = await supabase
    .from('tenants')
    .select(`
      id,
      subdomain,
      organization:organizations(name)
    `)
    .eq('subdomain', 'siga')
    .single()

  if (tenantBySubdomain && !subdomainError) {
    console.log(`✅ Found SIGA tenant: ${tenantBySubdomain.subdomain} (${tenantBySubdomain.organization?.name})`)
    return tenantBySubdomain
  }

  // Try finding by organization name
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select(`
      id,
      subdomain,
      organization:organizations(name)
    `)

  if (error) {
    console.error('❌ Error finding tenants:', error.message)
    return null
  }

  const sigaTenant = tenants?.find(t => 
    t.organization?.name?.toLowerCase().includes('siga') ||
    t.subdomain?.toLowerCase().includes('siga')
  )

  if (sigaTenant) {
    console.log(`✅ Found SIGA tenant: ${sigaTenant.subdomain} (${sigaTenant.organization?.name})`)
    return sigaTenant
  }

  console.error('❌ Could not find SIGA tenant')
  return null
}

async function checkExistingCorporativo(tenantId: string): Promise<boolean> {
  console.log('\n🔍 Checking for existing Corporativo area...')
  
  const { data, error } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .ilike('name', 'corporativo')
    .single()

  if (data && !error) {
    console.log(`⚠️  Corporativo area already exists (ID: ${data.id})`)
    
    const answer = await promptUser('Do you want to delete it and recreate? (yes/no): ')
    if (answer === 'yes' || answer === 'y') {
      // Delete existing area
      const { error: deleteError } = await supabase
        .from('areas')
        .delete()
        .eq('id', data.id)
      
      if (deleteError) {
        console.error('❌ Error deleting existing area:', deleteError.message)
        return false
      }
      console.log('✅ Deleted existing Corporativo area')
    } else {
      return false
    }
  }
  
  return true
}

async function createCorporativoArea(tenantId: string): Promise<string | null> {
  console.log('\n🏗️  Creating Corporativo area...')
  
  const { data, error } = await supabase
    .from('areas')
    .insert({
      tenant_id: tenantId,
      name: 'Corporativo',
      description: 'Área corporativa para gestión estratégica y administrativa de alto nivel',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (error) {
    console.error('❌ Error creating area:', error.message)
    return null
  }

  console.log(`✅ Created Corporativo area (ID: ${data.id})`)
  return data.id
}

async function getSigaCeoAdminUsers(tenantId: string): Promise<UserProfile[]> {
  console.log('\n👥 Finding CEO and Admin users from SIGA...')
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      full_name,
      email,
      role,
      area_id,
      area:areas(name)
    `)
    .eq('tenant_id', tenantId)
    .in('role', ['CEO', 'Admin'])
    .order('role')
    .order('full_name')

  if (error) {
    console.error('❌ Error fetching users:', error.message)
    return []
  }

  console.log(`\n📊 Found ${data?.length || 0} users:`)
  
  const ceoCount = data?.filter(u => u.role === 'CEO').length || 0
  const adminCount = data?.filter(u => u.role === 'Admin').length || 0
  
  console.log(`   - CEOs: ${ceoCount}`)
  console.log(`   - Admins: ${adminCount}`)
  
  if (data && data.length > 0) {
    console.log('\n📋 Users to update:')
    data.forEach(user => {
      const currentArea = user.area?.name || 'No area assigned'
      console.log(`   - ${user.full_name} (${user.role}) - Currently in: ${currentArea}`)
    })
  }

  return data || []
}

async function assignUsersToCorporativo(users: UserProfile[], corporativoAreaId: string): Promise<void> {
  if (users.length === 0) {
    console.log('\n⚠️  No users to update')
    return
  }

  console.log(`\n🔄 Assigning ${users.length} users to Corporativo area...`)
  
  const userIds = users.map(u => u.id)
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      area_id: corporativoAreaId,
      updated_at: new Date().toISOString()
    })
    .in('id', userIds)

  if (error) {
    console.error('❌ Error updating users:', error.message)
    throw error
  }

  console.log('✅ Successfully assigned all users to Corporativo area')
}

async function verifyResults(tenantId: string, corporativoAreaId: string): Promise<void> {
  console.log('\n📊 Verifying results...')

  // Get updated users
  const { data: users } = await supabase
    .from('user_profiles')
    .select(`
      id,
      full_name,
      role,
      area:areas(name)
    `)
    .eq('area_id', corporativoAreaId)
    .order('role')
    .order('full_name')

  console.log(`\n✅ Users now in Corporativo area:`)
  users?.forEach(user => {
    console.log(`   - ${user.full_name} (${user.role})`)
  })

  // Get all areas for SIGA with user counts
  const { data: areas } = await supabase
    .from('areas')
    .select(`
      id,
      name,
      user_profiles!inner(
        id,
        role
      )
    `)
    .eq('tenant_id', tenantId)

  console.log('\n📈 SIGA areas summary:')
  
  // Process areas to count users by role
  const areasSummary = new Map()
  
  areas?.forEach(area => {
    if (!areasSummary.has(area.name)) {
      areasSummary.set(area.name, {
        total: 0,
        ceo: 0,
        admin: 0,
        manager: 0
      })
    }
    
    const summary = areasSummary.get(area.name)
    area.user_profiles?.forEach((user: any) => {
      summary.total++
      if (user.role === 'CEO') summary.ceo++
      else if (user.role === 'Admin') summary.admin++
      else if (user.role === 'Manager') summary.manager++
    })
  })

  areasSummary.forEach((summary, areaName) => {
    console.log(`   - ${areaName}: ${summary.total} users (CEO: ${summary.ceo}, Admin: ${summary.admin}, Manager: ${summary.manager})`)
  })
}

// Main execution
async function main() {
  console.log('================================================')
  console.log('  RECREATE CORPORATIVO AREA FOR SIGA TENANT')
  console.log('================================================')
  console.log('\nThis script will:')
  console.log('  1. Create "Corporativo" area for SIGA tenant')
  console.log('  2. Assign all CEO and Admin users to this area')
  console.log('================================================')

  // Find SIGA tenant
  const sigaTenant = await findSigaTenant()
  if (!sigaTenant) {
    console.error('\n❌ Cannot proceed without SIGA tenant')
    process.exit(1)
  }

  // Check for existing Corporativo area
  const shouldProceed = await checkExistingCorporativo(sigaTenant.id)
  if (!shouldProceed) {
    console.log('\n❌ Script cancelled')
    process.exit(0)
  }

  // Get users to update
  const users = await getSigaCeoAdminUsers(sigaTenant.id)
  
  if (users.length === 0) {
    console.log('\n⚠️  No CEO or Admin users found in SIGA tenant')
    const answer = await promptUser('Do you still want to create the Corporativo area? (yes/no): ')
    
    if (answer !== 'yes' && answer !== 'y') {
      console.log('\n❌ Script cancelled')
      process.exit(0)
    }
  }

  // Ask for confirmation
  console.log('\n================================================')
  const answer = await promptUser('Do you want to proceed? (yes/no): ')

  if (answer !== 'yes' && answer !== 'y') {
    console.log('\n❌ Script cancelled by user')
    process.exit(0)
  }

  // Create Corporativo area
  const corporativoAreaId = await createCorporativoArea(sigaTenant.id)
  if (!corporativoAreaId) {
    console.error('\n❌ Failed to create Corporativo area')
    process.exit(1)
  }

  // Assign users to Corporativo area
  if (users.length > 0) {
    await assignUsersToCorporativo(users, corporativoAreaId)
  }

  // Verify results
  await verifyResults(sigaTenant.id, corporativoAreaId)

  console.log('\n✅ Script completed successfully!')
  console.log('================================================')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Script failed:', error)
  process.exit(1)
})

/*
USAGE INSTRUCTIONS:
==================

1. Ensure environment variables are set:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

2. Run the script:
   npx tsx scripts/recreate-corporativo-area.ts

3. Follow the prompts

4. Verify in your application that:
   - CEO and Admin users can see the Corporativo area
   - They can access all necessary data
   - The area appears correctly in the UI
*/