require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function showCurrentTrigger() {
  console.log('Querying current trigger function and definition...\n');
  
  try {
    // Show the current handle_new_user function
    console.log('1. Current handle_new_user function:');
    console.log('==================================');
    
    const { data: functionDef, error: funcError } = await supabaseAdmin
      .from('pg_proc')
      .select(`
        proname,
        pg_get_functiondef
      `)
      .eq('proname', 'handle_new_user');
    
    if (funcError) {
      console.log('Direct query failed, trying SQL query...');
      
      // Use raw SQL query
      const { data: sqlResult, error: sqlError } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: `
            SELECT 
              p.proname as function_name,
              pg_get_functiondef(p.oid) as function_definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'handle_new_user'
            AND n.nspname = 'public';
          `
        });
      
      if (sqlError) {
        console.log('SQL query also failed. Trying alternative approach...');
        
        // Try information_schema approach
        const { data: triggerInfo, error: triggerError } = await supabaseAdmin
          .rpc('exec_sql', {
            sql: `
              SELECT 
                trigger_name,
                event_manipulation,
                action_timing,
                action_statement
              FROM information_schema.triggers 
              WHERE event_object_table = 'users' 
              AND event_object_schema = 'auth'
              AND trigger_name = 'on_auth_user_created';
            `
          });
        
        if (triggerInfo) {
          console.log('Trigger information:');
          console.log(JSON.stringify(triggerInfo, null, 2));
        } else {
          console.log('Error getting trigger info:', triggerError?.message);
        }
      } else {
        console.log('Function definition:');
        console.log(JSON.stringify(sqlResult, null, 2));
      }
    } else {
      console.log('Function definition:');
      console.log(JSON.stringify(functionDef, null, 2));
    }
    
    // Check if we can see the current user_profiles table structure
    console.log('\n2. user_profiles table structure:');
    console.log('=================================');
    
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (tableInfo) {
      console.log('Table columns:');
      tableInfo.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    } else {
      console.log('Error getting table info:', tableError?.message);
    }
    
    // Check user_role enum values
    console.log('\n3. user_role enum values:');
    console.log('========================');
    
    const { data: enumInfo, error: enumError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT 
            enumlabel
          FROM pg_enum 
          WHERE enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'user_role'
          )
          ORDER BY enumsortorder;
        `
      });
    
    if (enumInfo) {
      console.log('Available role values:');
      enumInfo.forEach(val => {
        console.log(`  - ${val.enumlabel}`);
      });
    } else {
      console.log('Error getting enum info:', enumError?.message);
    }
    
  } catch (error) {
    console.error('Error querying database:', error.message);
    
    // Fallback: just show what we know about the error
    console.log('\nFallback information:');
    console.log('===================');
    console.log('The error "column role is of type user_role but expression is of type text" suggests:');
    console.log('1. The trigger function is trying to insert a text value into a user_role enum column');
    console.log('2. The fix is to cast the role properly: (metadata_value)::user_role');
    console.log('3. The trigger name is: on_auth_user_created');
    console.log('4. The function name is: handle_new_user');
  }
}

// Run the query
showCurrentTrigger();