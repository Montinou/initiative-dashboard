#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 Environment Variables:');
  console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`  ANON_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SERVICE_KEY: ${serviceKey ? '✅ Set' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Testing basic connection...');
    
    // Test 1: Basic connection with health check
    const { data: healthData, error: healthError } = await supabase
      .from('tenants')
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ Connection failed:', healthError.message);
      return;
    }

    console.log('✅ Basic connection successful');
    console.log(`📊 Found ${healthData || 0} tenant records\n`);

    // Test 2: Test main tables exist
    console.log('🔄 Testing table accessibility...');
    
    const tables = ['tenants', 'areas', 'initiatives', 'user_profiles'];
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`✅ Table '${table}': Accessible`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }

    // Test 3: Test view access
    console.log('\n🔄 Testing view accessibility...');
    try {
      const { data, error } = await supabase
        .from('initiatives_with_subtasks_summary')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ View 'initiatives_with_subtasks_summary': ${error.message}`);
      } else {
        console.log(`✅ View 'initiatives_with_subtasks_summary': Accessible`);
      }
    } catch (err) {
      console.log(`❌ View 'initiatives_with_subtasks_summary': ${err.message}`);
    }

    // Test 4: Test RLS policies (should restrict without auth)
    console.log('\n🔄 Testing Row Level Security...');
    try {
      const { data, error } = await supabase
        .from('initiatives')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('✅ RLS is working - anonymous access restricted');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`⚠️  RLS might be disabled - got ${data.length} records without auth`);
      }
    } catch (err) {
      console.log('✅ RLS is working - anonymous access restricted');
      console.log(`   Error: ${err.message}`);
    }

    console.log('\n📝 Connection test completed!');
    console.log('💡 To test authenticated queries, use a valid user session.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testDatabaseConnection().catch(console.error);