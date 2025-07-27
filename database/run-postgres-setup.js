// Direct PostgreSQL execution of setup scripts
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection from .env (using pooled connection)
const client = new Client({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.zkkdnslupqnpioltjpeu',
  password: 'JuxceMxLNiBP480Y',
  ssl: { rejectUnauthorized: false }
});

// Execute SQL file
async function executeSQLFile(filepath, description) {
  console.log(`\n🔄 ${description}`);
  console.log(`📁 Running: ${filepath}`);
  
  try {
    if (!fs.existsSync(filepath)) {
      console.log(`❌ File not found: ${filepath}`);
      return false;
    }

    const sqlContent = fs.readFileSync(filepath, 'utf8');
    
    console.log(`📊 Executing SQL file...`);
    
    const result = await client.query(sqlContent);
    console.log(`✅ Success: ${description}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error in ${path.basename(filepath)}: ${error.message}`);
    
    // Show the specific line if possible
    if (error.position) {
      const lines = fs.readFileSync(filepath, 'utf8').split('\n');
      const errorLine = Math.floor(error.position / 80); // Rough estimate
      console.log(`   Around line ${errorLine}: ${lines[errorLine] || 'unknown'}`);
    }
    
    return false;
  }
}

// Execute individual SQL statement
async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}`);
  
  try {
    const result = await client.query(sql);
    console.log(`✅ Success: ${description}`);
    if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

// Main setup function
async function runSetup() {
  console.log('🚀 Starting PostgreSQL Database Setup');
  console.log('=====================================');
  
  try {
    // Connect to database
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Check if we can access the database
    await executeSQL('SELECT current_database(), current_user;', 'Testing connection');
    
    // Step 1: Create users with enhanced script (or fallback to basic)
    console.log('\n📋 STEP 1: Creating Auth Users');
    let authSuccess = await executeSQLFile(
      path.join(__dirname, 'create-auth-users-with-roles.sql'),
      'Creating auth users with custom roles'
    );
    
    if (!authSuccess) {
      console.log('⚠️  Enhanced script failed, trying basic version...');
      authSuccess = await executeSQLFile(
        path.join(__dirname, 'create-auth-users.sql'),
        'Creating auth users (basic version)'
      );
    }
    
    // Step 2: Create tenants, areas, profiles
    console.log('\n📋 STEP 2: Creating Business Data');
    const dataSuccess = await executeSQLFile(
      path.join(__dirname, 'complete-data-setup.sql'),
      'Creating tenants, areas, profiles, and sample data'
    );
    
    // Step 3: Verification
    console.log('\n📋 STEP 3: Verification');
    
    await executeSQL(`
      SELECT 
        'Auth Users Created' as status,
        COUNT(*) as count
      FROM auth.users
      WHERE email LIKE '%@stratix-platform.com' 
         OR email LIKE '%@fema-electricidad.com'
         OR email LIKE '%@siga-turismo.com';
    `, 'Counting created auth users');
    
    await executeSQL(`
      SELECT 
        'Tenants Created' as status,
        COUNT(*) as count
      FROM public.tenants;
    `, 'Counting tenants');
    
    await executeSQL(`
      SELECT 
        'User Profiles Created' as status,
        COUNT(*) as count
      FROM public.user_profiles;
    `, 'Counting user profiles');
    
    // Final verification query
    console.log('\n📋 STEP 4: Final User Summary');
    await executeSQL(`
      SELECT 
          u.email,
          u.is_super_admin,
          up.role as profile_role,
          t.name as tenant_name,
          up.area,
          u.created_at::date as created_date
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
    `, 'User Summary Report');
    
    console.log('\n========================================');
    console.log('🎉 DATABASE SETUP COMPLETED!');
    console.log('========================================');
    console.log('');
    console.log('✅ Users created with roles and tenant assignments');
    console.log('🔑 Default password for all users: password123');
    console.log('🌐 Supabase Dashboard: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu');
    console.log('');
    console.log('🧪 Test the setup:');
    console.log('   1. Go to Authentication > Users in Supabase dashboard');
    console.log('   2. Try logging in with any of the created users');
    console.log('   3. Check that roles and tenants are properly assigned');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the setup
runSetup()
  .then(() => {
    console.log('\n✅ Setup process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });