#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the database with initial test data from seed.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Read the seed SQL file
    const seedSql = fs.readFileSync(path.join(__dirname, '../docs/seed.sql'), 'utf8');
    
    // Split SQL statements by semicolon and filter empty statements
    const statements = seedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        // Extract table name for logging
        const tableMatch = statement.match(/INSERT INTO public\.(\w+)/i) || 
                          statement.match(/UPDATE public\.(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        
        console.log(`\n${i + 1}. Executing statement for table: ${tableName}`);
        
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC doesn't exist
          const { data, error: queryError } = await supabase
            .from('_sql')
            .select()
            .sql(statement);
          
          if (queryError) {
            throw queryError;
          }
        }
        
        successCount++;
        console.log(`   ✅ Success`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error: ${error.message}`);
        
        // Continue with other statements even if one fails
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          console.log('   ℹ️  Data already exists, skipping...');
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`🏁 Seeding completed!`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    // Verify data was inserted
    console.log('\n📊 Verifying seed data...');
    
    const { data: tenants } = await supabase.from('tenants').select('count');
    const { data: areas } = await supabase.from('areas').select('count');
    const { data: users } = await supabase.from('user_profiles').select('count');
    const { data: objectives } = await supabase.from('objectives').select('count');
    const { data: initiatives } = await supabase.from('initiatives').select('count');
    
    console.log('   Tenants: ', tenants?.length || 0);
    console.log('   Areas: ', areas?.length || 0);
    console.log('   Users: ', users?.length || 0);
    console.log('   Objectives: ', objectives?.length || 0);
    console.log('   Initiatives: ', initiatives?.length || 0);
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();