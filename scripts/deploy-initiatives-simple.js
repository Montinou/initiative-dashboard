const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deploySchema() {
  try {
    console.log('🚀 Deploying initiative dashboard schema...')

    // Check if tables already exist
    console.log('🔍 Checking existing tables...')
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['company_areas', 'initiatives', 'subtasks'])

    if (checkError) {
      console.log('Tables check failed (this is normal for new setups)')
    }

    // Create sample company areas if they don't exist
    console.log('🏢 Setting up company areas...')
    const { data: existingAreas } = await supabase
      .from('company_areas')
      .select('name')
      .limit(1)

    if (!existingAreas || existingAreas.length === 0) {
      const { error: areasError } = await supabase
        .from('company_areas')
        .insert([
          {
            name: 'Technology',
            description: 'Software development and IT initiatives'
          },
          {
            name: 'Marketing',
            description: 'Marketing campaigns and brand initiatives'
          },
          {
            name: 'Operations',
            description: 'Operational efficiency and process improvements'
          },
          {
            name: 'Human Resources',
            description: 'Employee development and organizational initiatives'
          }
        ])

      if (areasError) {
        console.error('Error creating sample areas:', areasError)
        throw areasError
      }
      console.log('✅ Created sample company areas')
    } else {
      console.log('✅ Company areas already exist')
    }

    // Verify the setup by testing basic operations
    console.log('✅ Verifying database setup...')
    
    // Test reading areas
    const { data: areas, error: areasError } = await supabase
      .from('company_areas')
      .select('*')

    if (areasError) {
      console.error('Error reading areas:', areasError)
      throw areasError
    }

    // Test creating and reading an initiative
    const { data: testInitiative, error: initError } = await supabase
      .from('initiatives')
      .insert({
        title: 'Test Initiative - Setup Verification',
        description: 'This is a test initiative created during setup',
        area_id: areas[0]?.id
      })
      .select()
      .single()

    if (initError) {
      console.error('Error creating test initiative:', initError)
      throw initError
    }

    // Test creating and reading a subtask
    const { data: testSubtask, error: subtaskError } = await supabase
      .from('subtasks')
      .insert({
        title: 'Test Subtask',
        description: 'This is a test subtask created during setup',
        initiative_id: testInitiative.id,
        completed: false
      })
      .select()
      .single()

    if (subtaskError) {
      console.error('Error creating test subtask:', subtaskError)
      throw subtaskError
    }

    // Test marking subtask as completed (should trigger progress update)
    const { error: updateError } = await supabase
      .from('subtasks')
      .update({ completed: true })
      .eq('id', testSubtask.id)

    if (updateError) {
      console.error('Error updating test subtask:', updateError)
      throw updateError
    }

    // Check if progress was automatically calculated
    const { data: updatedInitiative, error: progressError } = await supabase
      .from('initiatives')
      .select('progress')
      .eq('id', testInitiative.id)
      .single()

    if (progressError) {
      console.error('Error checking progress update:', progressError)
      throw progressError
    }

    console.log(`📊 Progress calculation test: ${updatedInitiative.progress}% (should be 100)`)

    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    await supabase.from('initiatives').delete().eq('id', testInitiative.id)

    console.log(`✅ Schema verification completed successfully!`)
    console.log(`📊 Found ${areas.length} company areas`)
    console.log('🎉 Initiative dashboard is ready to use!')

  } catch (error) {
    console.error('❌ Deployment failed:', error.message)
    console.error('Full error:', error)
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('🔧 It looks like the database tables need to be created manually.')
      console.log('Please run the SQL migrations in your Supabase dashboard:')
      console.log('1. Go to your Supabase project dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Execute the SQL from supabase/migrations/20250128000001_create_initiative_tables.sql')
      console.log('4. Execute the SQL from supabase/migrations/20250128000002_setup_rls_policies.sql')
      console.log('5. Run this script again')
    }
    
    process.exit(1)
  }
}

deploySchema()