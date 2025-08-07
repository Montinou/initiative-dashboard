// Recreate all demo users properly through Supabase Auth API
const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Demo users to create
const demoUsers = [
  { email: 'ceo_siga@example.com', full_name: 'Carlos Mendoza', role: 'CEO', tenant_id: 'siga-turismo' },
  { email: 'admin_siga@example.com', full_name: 'Ana García', role: 'Admin', tenant_id: 'siga-turismo' },
  { email: 'manager_adm@siga.com', full_name: 'Roberto Silva', role: 'Manager', tenant_id: 'siga-turismo' },
  { email: 'manager_ch@siga.com', full_name: 'María López', role: 'Manager', tenant_id: 'siga-turismo' },
  { email: 'manager_com@siga.com', full_name: 'Juan Pérez', role: 'Manager', tenant_id: 'siga-turismo' },
  { email: 'manager_prod@siga.com', full_name: 'Laura Martínez', role: 'Manager', tenant_id: 'siga-turismo' },
  { email: 'ceo_fema@example.com', full_name: 'Francisco Torres', role: 'CEO', tenant_id: 'fema-electricidad' },
  { email: 'admin_fema@example.com', full_name: 'Carmen Rodríguez', role: 'Admin', tenant_id: 'fema-electricidad' },
  { email: 'manager_adm@fema.com', full_name: 'Diego Hernández', role: 'Manager', tenant_id: 'fema-electricidad' },
  { email: 'manager_ch@fema.com', full_name: 'Patricia Gómez', role: 'Manager', tenant_id: 'fema-electricidad' },
  { email: 'manager_com@fema.com', full_name: 'Andrés Morales', role: 'Manager', tenant_id: 'fema-electricidad' },
  { email: 'manager_prod@fema.com', full_name: 'Sofía Jiménez', role: 'Manager', tenant_id: 'fema-electricidad' }
];

// Store created user IDs for the migration
const createdUsers = [];

async function recreateAllDemoUsers() {
  console.log('Recreating all demo users through Supabase Auth API...\n');
  
  // First, get existing users to check if they exist
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const userData of demoUsers) {
    console.log(`\nProcessing: ${userData.email}`);
    
    // Check if user already exists
    const existingUser = existingUsers.users?.find(u => u.email === userData.email);
    
    if (existingUser) {
      console.log(`  User already exists with ID: ${existingUser.id}`);
      console.log(`  Updating password...`);
      
      // Update existing user's password
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            full_name: userData.full_name,
            role: userData.role,
            tenant_id: userData.tenant_id
          }
        }
      );
      
      if (updateError) {
        console.error(`  ❌ Error updating user:`, updateError.message);
        errorCount++;
      } else {
        console.log(`  ✅ User updated successfully`);
        createdUsers.push({
          id: existingUser.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          tenant_id: userData.tenant_id
        });
        successCount++;
      }
    } else {
      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role,
          tenant_id: userData.tenant_id
        }
      });
      
      if (error) {
        console.error(`  ❌ Error creating user:`, error.message);
        errorCount++;
      } else {
        console.log(`  ✅ User created successfully`);
        console.log(`  ID: ${data.user?.id}`);
        createdUsers.push({
          id: data.user?.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          tenant_id: userData.tenant_id
        });
        successCount++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  ✅ Successfully processed: ${successCount} users`);
  console.log(`  ❌ Failed: ${errorCount} users`);
  console.log('\n' + '='.repeat(60));
  
  // Generate SQL migration to update user_profiles
  if (createdUsers.length > 0) {
    console.log('\nGenerating SQL migration to update user_profiles...\n');
    
    const migrationSQL = `-- =============================================
-- Migration 014: Link Auth Users to Profiles
-- =============================================
-- This migration updates user_profiles to link with recreated auth users

DO $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating user_profiles with new auth user IDs...';
    
${createdUsers.map(user => `    -- Update ${user.email}
    UPDATE user_profiles 
    SET 
        user_id = '${user.id}'::uuid,
        updated_at = now()
    WHERE email = '${user.email}';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for ${user.email}';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for ${user.email}';
    END IF;
`).join('\n')}
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ User profiles have been linked to auth users';
    RAISE NOTICE '✅ All users can now login with password: password123';
END $$;`;
    
    // Save the migration
    const fs = require('fs');
    const migrationPath = 'supabase/migrations/20240101000014_link_auth_users.sql';
    fs.writeFileSync(migrationPath, migrationSQL);
    console.log(`Migration saved to: ${migrationPath}`);
    console.log('\nRun this command to apply the migration:');
    console.log('npx supabase db push --linked');
  }
  
  // Test login for one user
  console.log('\n' + '='.repeat(60));
  console.log('Testing login with ceo_siga@example.com...');
  
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'ceo_siga@example.com',
    password: 'password123'
  });
  
  if (signInError) {
    console.error('❌ Sign in test failed:', signInError.message);
  } else {
    console.log('✅ Sign in test successful!');
    console.log(`  User ID: ${signInData.user?.id}`);
    console.log(`  Email: ${signInData.user?.email}`);
  }
}

recreateAllDemoUsers().catch(console.error);