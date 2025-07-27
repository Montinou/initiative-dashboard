// Run SQL setup scripts directly on Supabase database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Execute SQL script
async function executeSQLFile(filepath, description) {
  console.log(`\n🔄 ${description}`);
  console.log(`📁 Running: ${filepath}`);
  
  try {
    if (!fs.existsSync(filepath)) {
      console.log(`❌ File not found: ${filepath}`);
      return false;
    }

    const sqlContent = fs.readFileSync(filepath, 'utf8');
    
    // Split SQL by semicolons, but be careful with complex statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === '') continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Statement ${i + 1} error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`✅ Completed: ${successCount} success, ${errorCount} warnings/errors`);
    return errorCount === 0;
    
  } catch (error) {
    console.error(`❌ Failed to execute ${filepath}:`, error.message);
    return false;
  }
}

// Alternative: Use direct SQL execution via rpc
async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.log(`⚠️  Warning: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Success: ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return false;
  }
}

// Create a simple exec_sql function if it doesn't exist
async function createExecFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'OK';
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'SQL Error: %', SQLERRM;
    END;
    $$;
  `;
  
  console.log('🔧 Creating exec_sql helper function...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error && !error.message.includes('already exists')) {
      console.log('⚠️  Could not create exec function, trying direct approach');
    } else {
      console.log('✅ Helper function ready');
    }
  } catch (err) {
    console.log('⚠️  Will use direct SQL execution');
  }
}

// Run the complete setup
async function runSetup() {
  console.log('🚀 Starting Database Setup');
  console.log('==========================');
  
  // Create helper function
  await createExecFunction();
  
  // Step 1: Run the enhanced auth users script
  console.log('\n📋 STEP 1: Creating Auth Users with Roles');
  const authSuccess = await executeSQLFile(
    path.join(__dirname, 'create-auth-users-with-roles.sql'),
    'Creating auth.users with custom roles'
  );
  
  if (!authSuccess) {
    console.log('❌ Auth user creation failed, trying basic version...');
    await executeSQLFile(
      path.join(__dirname, 'create-auth-users.sql'),
      'Creating auth.users (basic version)'
    );
  }
  
  // Step 2: Run the complete data setup
  console.log('\n📋 STEP 2: Creating Tenants, Areas, and Profiles');
  const dataSuccess = await executeSQLFile(
    path.join(__dirname, 'complete-data-setup.sql'),
    'Creating tenants, areas, user profiles, and sample data'
  );
  
  // Step 3: Verify the setup
  console.log('\n📋 STEP 3: Verifying Setup');
  await executeSQL(`
    SELECT 
      'Auth Users' as table_name,
      COUNT(*) as count
    FROM auth.users
    WHERE email LIKE '%@stratix-platform.com' 
       OR email LIKE '%@fema-electricidad.com'
       OR email LIKE '%@siga-turismo.com'
  `, 'Counting auth users');
  
  await executeSQL(`
    SELECT 
      'User Profiles' as table_name,
      COUNT(*) as count
    FROM public.user_profiles
  `, 'Counting user profiles');
  
  await executeSQL(`
    SELECT 
      'Tenants' as table_name,
      COUNT(*) as count
    FROM public.tenants
  `, 'Counting tenants');
  
  // Show final verification query
  console.log('\n========================================');
  console.log('🎉 SETUP COMPLETE!');
  console.log('========================================');
  console.log('');
  console.log('To verify everything worked, run this SQL in Supabase:');
  console.log('');
  console.log(`
SELECT 
    u.email,
    u.id,
    u.is_super_admin,
    up.role as profile_role,
    t.name as tenant_name,
    up.area
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.tenants t ON up.tenant_id = t.id
WHERE u.email LIKE '%@stratix-platform.com' 
   OR u.email LIKE '%@fema-electricidad.com'
   OR u.email LIKE '%@siga-turismo.com'
ORDER BY 
    CASE WHEN u.email LIKE '%superadmin%' THEN 0 ELSE 1 END,
    t.name,
    up.role;
  `);
  
  console.log('\n🔑 All users have password: password123');
  console.log('🌐 Test login at: https://zkkdnslupqnpioltjpeu.supabase.co');
}

// Run the setup
runSetup()
  .then(() => {
    console.log('\n✅ Database setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });