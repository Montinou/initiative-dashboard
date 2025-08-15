/**
 * Production Database Cleanup Script
 * 
 * Purpose: Remove all data not belonging to core areas:
 *   - Producto
 *   - Capital Humano
 *   - Administración
 *   - Comercial
 * 
 * WARNING: This script will DELETE production data!
 * Please backup your database before running.
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

// Core areas to keep
const CORE_AREAS = [
  'producto',
  'capital humano',
  'administración',
  'administracion', // Alternative spelling
  'comercial'
]

interface Area {
  id: string
  name: string
  tenant_id: string
}

interface DeleteSummary {
  areas: string[]
  initiativesCount: number
  objectivesCount: number
  activitiesCount: number
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

async function getAreasToDelete(): Promise<Area[]> {
  console.log('\n📊 Fetching all areas...')
  
  const { data: allAreas, error } = await supabase
    .from('areas')
    .select('id, name, tenant_id')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch areas: ${error.message}`)
  }

  const areasToKeep = allAreas?.filter(area => 
    CORE_AREAS.includes(area.name.toLowerCase().trim())
  ) || []

  const areasToDelete = allAreas?.filter(area => 
    !CORE_AREAS.includes(area.name.toLowerCase().trim())
  ) || []

  console.log('\n✅ Areas to KEEP:')
  areasToKeep.forEach(area => {
    console.log(`   - ${area.name} (${area.id})`)
  })

  console.log('\n❌ Areas to DELETE:')
  if (areasToDelete.length === 0) {
    console.log('   (No areas to delete)')
  } else {
    areasToDelete.forEach(area => {
      console.log(`   - ${area.name} (${area.id})`)
    })
  }

  return areasToDelete
}

async function getDeleteSummary(areasToDelete: Area[]): Promise<DeleteSummary> {
  if (areasToDelete.length === 0) {
    return {
      areas: [],
      initiativesCount: 0,
      objectivesCount: 0,
      activitiesCount: 0
    }
  }

  const areaIds = areasToDelete.map(a => a.id)

  // Count initiatives
  const { count: initiativesCount } = await supabase
    .from('initiatives')
    .select('*', { count: 'exact', head: true })
    .in('area_id', areaIds)

  // Count objectives
  const { count: objectivesCount } = await supabase
    .from('objectives')
    .select('*', { count: 'exact', head: true })
    .in('area_id', areaIds)

  // Get initiatives to count activities
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('id')
    .in('area_id', areaIds)

  let activitiesCount = 0
  if (initiatives && initiatives.length > 0) {
    const initiativeIds = initiatives.map(i => i.id)
    const { count } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .in('initiative_id', initiativeIds)
    activitiesCount = count || 0
  }

  return {
    areas: areasToDelete.map(a => a.name),
    initiativesCount: initiativesCount || 0,
    objectivesCount: objectivesCount || 0,
    activitiesCount: activitiesCount || 0
  }
}

async function deleteData(areasToDelete: Area[]): Promise<void> {
  if (areasToDelete.length === 0) {
    console.log('\n✅ No data to delete')
    return
  }

  const areaIds = areasToDelete.map(a => a.id)
  
  console.log('\n🗑️  Starting deletion process...')

  try {
    // 1. Get all initiatives from areas to delete
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('id')
      .in('area_id', areaIds)

    const initiativeIds = initiatives?.map(i => i.id) || []

    // 2. Get all objectives from areas to delete
    const { data: objectives } = await supabase
      .from('objectives')
      .select('id')
      .in('area_id', areaIds)

    const objectiveIds = objectives?.map(o => o.id) || []

    // 3. Delete activities
    if (initiativeIds.length > 0) {
      console.log('   Deleting activities...')
      const { error } = await supabase
        .from('activities')
        .delete()
        .in('initiative_id', initiativeIds)
      
      if (error) console.error('   ⚠️  Error deleting activities:', error.message)
    }

    // 4. Delete progress_history
    if (initiativeIds.length > 0) {
      console.log('   Deleting progress history...')
      const { error } = await supabase
        .from('progress_history')
        .delete()
        .in('initiative_id', initiativeIds)
      
      if (error) console.error('   ⚠️  Error deleting progress_history:', error.message)
    }

    // 5. Delete objective_initiatives links
    if (initiativeIds.length > 0 || objectiveIds.length > 0) {
      console.log('   Deleting objective-initiative links...')
      
      if (initiativeIds.length > 0) {
        const { error } = await supabase
          .from('objective_initiatives')
          .delete()
          .in('initiative_id', initiativeIds)
        
        if (error) console.error('   ⚠️  Error deleting objective_initiatives:', error.message)
      }

      if (objectiveIds.length > 0) {
        const { error } = await supabase
          .from('objective_initiatives')
          .delete()
          .in('objective_id', objectiveIds)
        
        if (error) console.error('   ⚠️  Error deleting objective_initiatives:', error.message)
      }
    }

    // 6. Delete objective_quarters links
    if (objectiveIds.length > 0) {
      console.log('   Deleting objective-quarter links...')
      const { error } = await supabase
        .from('objective_quarters')
        .delete()
        .in('objective_id', objectiveIds)
      
      if (error) console.error('   ⚠️  Error deleting objective_quarters:', error.message)
    }

    // 7. Delete file associations
    console.log('   Deleting file associations...')
    await supabase
      .from('file_areas')
      .delete()
      .in('area_id', areaIds)

    if (initiativeIds.length > 0) {
      await supabase
        .from('file_initiatives')
        .delete()
        .in('initiative_id', initiativeIds)
    }

    // 8. Delete initiatives
    if (initiativeIds.length > 0) {
      console.log('   Deleting initiatives...')
      const { error } = await supabase
        .from('initiatives')
        .delete()
        .in('id', initiativeIds)
      
      if (error) console.error('   ⚠️  Error deleting initiatives:', error.message)
    }

    // 9. Delete objectives
    if (objectiveIds.length > 0) {
      console.log('   Deleting objectives...')
      const { error } = await supabase
        .from('objectives')
        .delete()
        .in('id', objectiveIds)
      
      if (error) console.error('   ⚠️  Error deleting objectives:', error.message)
    }

    // 10. Update user profiles to remove area assignments
    console.log('   Updating user profiles...')
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ area_id: null })
      .in('area_id', areaIds)
    
    if (profileError) console.error('   ⚠️  Error updating user profiles:', profileError.message)

    // 11. Delete invitations
    console.log('   Deleting invitations...')
    await supabase
      .from('invitations')
      .delete()
      .in('area_id', areaIds)

    // 12. Delete import jobs
    console.log('   Deleting import jobs...')
    await supabase
      .from('okr_import_jobs')
      .delete()
      .in('area_id', areaIds)

    // 13. Finally, delete the areas
    console.log('   Deleting areas...')
    const { error: areaError } = await supabase
      .from('areas')
      .delete()
      .in('id', areaIds)
    
    if (areaError) {
      console.error('   ❌ Error deleting areas:', areaError.message)
      throw areaError
    }

    console.log('\n✅ Deletion complete!')

  } catch (error) {
    console.error('\n❌ Error during deletion:', error)
    throw error
  }
}

async function verifyResults(): Promise<void> {
  console.log('\n📊 Verifying results...')

  // Get remaining areas
  const { data: remainingAreas } = await supabase
    .from('areas')
    .select('name')
    .order('name')

  console.log('\n✅ Remaining areas:')
  remainingAreas?.forEach(area => {
    console.log(`   - ${area.name}`)
  })

  // Get counts
  const { count: initiativesCount } = await supabase
    .from('initiatives')
    .select('*', { count: 'exact', head: true })

  const { count: objectivesCount } = await supabase
    .from('objectives')
    .select('*', { count: 'exact', head: true })

  const { count: activitiesCount } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })

  console.log('\n📈 Final data summary:')
  console.log(`   - Areas: ${remainingAreas?.length || 0}`)
  console.log(`   - Objectives: ${objectivesCount || 0}`)
  console.log(`   - Initiatives: ${initiativesCount || 0}`)
  console.log(`   - Activities: ${activitiesCount || 0}`)
}

// Main execution
async function main() {
  console.log('========================================')
  console.log('  PRODUCTION DATABASE CLEANUP SCRIPT')
  console.log('========================================')
  console.log('\nThis script will DELETE all data not belonging to:')
  console.log('  • Producto')
  console.log('  • Capital Humano')
  console.log('  • Administración')
  console.log('  • Comercial')
  console.log('\n⚠️  WARNING: This action cannot be undone!')
  console.log('========================================')

  // Get areas to delete
  const areasToDelete = await getAreasToDelete()

  if (areasToDelete.length === 0) {
    console.log('\n✅ No areas need to be deleted. Database is already clean.')
    process.exit(0)
  }

  // Get summary of what will be deleted
  const summary = await getDeleteSummary(areasToDelete)

  console.log('\n📊 DELETION SUMMARY:')
  console.log('========================================')
  console.log(`   Areas to delete: ${summary.areas.length}`)
  console.log(`   Objectives to delete: ${summary.objectivesCount}`)
  console.log(`   Initiatives to delete: ${summary.initiativesCount}`)
  console.log(`   Activities to delete: ${summary.activitiesCount}`)
  console.log('========================================')

  // Ask for confirmation
  const answer = await promptUser('\n⚠️  Do you want to proceed with deletion? (yes/no): ')

  if (answer !== 'yes' && answer !== 'y') {
    console.log('\n❌ Deletion cancelled by user')
    process.exit(0)
  }

  // Double confirmation for production
  const confirm = await promptUser('\n⚠️  This is PRODUCTION data. Type "DELETE" to confirm: ')

  if (confirm !== 'delete') {
    console.log('\n❌ Deletion cancelled - confirmation not received')
    process.exit(0)
  }

  // Perform deletion
  await deleteData(areasToDelete)

  // Verify results
  await verifyResults()

  console.log('\n✅ Script completed successfully!')
}

// Run the script
main().catch(error => {
  console.error('\n❌ Script failed:', error)
  process.exit(1)
})

/*
USAGE INSTRUCTIONS:
==================

1. BACKUP YOUR DATABASE FIRST!
   Use Supabase dashboard or pg_dump

2. Ensure environment variables are set:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY

3. Run the script:
   npx tsx scripts/cleanup-non-core-areas.ts

4. Follow the prompts carefully

5. Verify the results in your database

To run without prompts (CI/CD):
Set environment variable: SKIP_CONFIRMATION=true
*/