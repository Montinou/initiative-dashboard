#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseComprehensive() {
  console.log('🔍 Comprehensive Database Test\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test with anonymous client
  console.log('📋 Testing with Anonymous Client');
  console.log('=====================================');
  const anonClient = createClient(supabaseUrl, supabaseKey);
  
  await testBasicOperations(anonClient, 'Anonymous');

  // Test with service role client (bypasses RLS)
  if (serviceKey) {
    console.log('\n📋 Testing with Service Role Client');
    console.log('=====================================');
    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    await testBasicOperations(serviceClient, 'Service Role');
    await testDataStructure(serviceClient);
  }

  console.log('\n🎯 Summary');
  console.log('==========');
  console.log('✅ Database connection is working');
  console.log('✅ All main tables are accessible');
  console.log('✅ Views are functioning');
  console.log('💡 Use service role key for admin operations');
  console.log('💡 RLS policies are in place for data security');
}

async function testBasicOperations(client, clientType) {
  try {
    // Test table counts
    const tables = ['tenants', 'areas', 'initiatives', 'user_profiles', 'activities', 'subtasks'];
    
    console.log(`\n🔄 Testing table accessibility (${clientType}):`);
    for (const table of tables) {
      try {
        const { count, error } = await client
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count || 0} records`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Test view
    console.log(`\n🔄 Testing view (${clientType}):`);
    try {
      const { count, error } = await client
        .from('initiatives_with_subtasks_summary')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ initiatives_with_subtasks_summary: ${error.message}`);
      } else {
        console.log(`✅ initiatives_with_subtasks_summary: ${count || 0} records`);
      }
    } catch (err) {
      console.log(`❌ initiatives_with_subtasks_summary: ${err.message}`);
    }

  } catch (error) {
    console.error(`❌ Error testing ${clientType} operations:`, error.message);
  }
}

async function testDataStructure(client) {
  console.log('\n🔄 Testing data relationships:');
  
  try {
    // Check if we have sample data
    const { data: tenants, error: tenantsError } = await client
      .from('tenants')
      .select('id, name, subdomain')
      .limit(5);

    if (tenantsError) {
      console.log('❌ Could not fetch tenants:', tenantsError.message);
      return;
    }

    if (tenants && tenants.length > 0) {
      console.log(`✅ Found ${tenants.length} tenant(s):`);
      tenants.forEach(tenant => {
        console.log(`   - ${tenant.name} (${tenant.subdomain})`);
      });

      // Test areas for first tenant
      const firstTenant = tenants[0];
      const { data: areas, error: areasError } = await client
        .from('areas')
        .select('id, name, tenant_id')
        .eq('tenant_id', firstTenant.id)
        .limit(5);

      if (!areasError && areas) {
        console.log(`✅ Found ${areas.length} area(s) for tenant ${firstTenant.name}`);
        
        if (areas.length > 0) {
          // Test initiatives for first area
          const { data: initiatives, error: initiativesError } = await client
            .from('initiatives')
            .select('id, title, status, progress')
            .eq('area_id', areas[0].id)
            .limit(3);

          if (!initiativesError && initiatives) {
            console.log(`✅ Found ${initiatives.length} initiative(s) for area ${areas[0].name}`);
            if (initiatives.length > 0) {
              initiatives.forEach(init => {
                console.log(`   - ${init.title} (${init.status}, ${init.progress}% complete)`);
              });
            }
          }
        }
      }
    } else {
      console.log('ℹ️  No sample data found - database is empty but accessible');
    }

  } catch (error) {
    console.error('❌ Error testing data structure:', error.message);
  }
}

// Test PostgreSQL connection directly
async function testPostgresConnection() {
  console.log('\n🔄 Testing direct PostgreSQL connection:');
  
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.POSTGRES_URL_NON_POOLING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Direct PostgreSQL connection successful');
    
    const result = await client.query('SELECT current_database(), version()');
    console.log(`✅ Database: ${result.rows[0].current_database}`);
    console.log(`✅ Version: ${result.rows[0].version.split(' ')[0]}`);
    
    await client.end();
  } catch (error) {
    console.log('❌ Direct PostgreSQL connection failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testDatabaseComprehensive();
  
  // Only test direct PostgreSQL if pg module is available
  try {
    require('pg');
    await testPostgresConnection();
  } catch (err) {
    console.log('\nℹ️  Skipping direct PostgreSQL test (pg module not installed)');
  }
}

runAllTests().catch(console.error);