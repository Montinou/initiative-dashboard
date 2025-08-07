// Create new users with simplified email format through Supabase Auth API
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

// Map old emails to new simplified format and user data
const emailMapping = [
  // SIGA users
  { 
    oldEmail: 'ceo_siga@example.com', 
    newEmail: 'ceo@siga.com',
    full_name: 'Carlos Mendoza',
    role: 'CEO',
    tenant_id: 'siga-turismo'
  },
  { 
    oldEmail: 'admin_siga@example.com',
    newEmail: 'admin@siga.com',
    full_name: 'Ana García',
    role: 'Admin',
    tenant_id: 'siga-turismo'
  },
  { 
    oldEmail: 'manager_adm@siga.com',
    newEmail: 'manager.adm@siga.com',
    full_name: 'Roberto Silva',
    role: 'Manager',
    tenant_id: 'siga-turismo'
  },
  { 
    oldEmail: 'manager_ch@siga.com',
    newEmail: 'manager.rrhh@siga.com',
    full_name: 'María López',
    role: 'Manager',
    tenant_id: 'siga-turismo'
  },
  { 
    oldEmail: 'manager_com@siga.com',
    newEmail: 'manager.comercial@siga.com',
    full_name: 'Juan Pérez',
    role: 'Manager',
    tenant_id: 'siga-turismo'
  },
  { 
    oldEmail: 'manager_prod@siga.com',
    newEmail: 'manager.produccion@siga.com',
    full_name: 'Laura Martínez',
    role: 'Manager',
    tenant_id: 'siga-turismo'
  },
  // FEMA users
  { 
    oldEmail: 'ceo_fema@example.com',
    newEmail: 'ceo@fema.com',
    full_name: 'Francisco Torres',
    role: 'CEO',
    tenant_id: 'fema-electricidad'
  },
  { 
    oldEmail: 'admin_fema@example.com',
    newEmail: 'admin@fema.com',
    full_name: 'Carmen Rodríguez',
    role: 'Admin',
    tenant_id: 'fema-electricidad'
  },
  { 
    oldEmail: 'manager_adm@fema.com',
    newEmail: 'manager.adm@fema.com',
    full_name: 'Diego Hernández',
    role: 'Manager',
    tenant_id: 'fema-electricidad'
  },
  { 
    oldEmail: 'manager_ch@fema.com',
    newEmail: 'manager.rrhh@fema.com',
    full_name: 'Patricia Gómez',
    role: 'Manager',
    tenant_id: 'fema-electricidad'
  },
  { 
    oldEmail: 'manager_com@fema.com',
    newEmail: 'manager.comercial@fema.com',
    full_name: 'Andrés Morales',
    role: 'Manager',
    tenant_id: 'fema-electricidad'
  },
  { 
    oldEmail: 'manager_prod@fema.com',
    newEmail: 'manager.produccion@fema.com',
    full_name: 'Sofía Jiménez',
    role: 'Manager',
    tenant_id: 'fema-electricidad'
  }
];

// Store created users for SQL generation
const createdUsers = [];

async function createSimplifiedUsers() {
  console.log('Creating users with simplified email format...\n');
  console.log('=' + '='.repeat(60));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const userMap of emailMapping) {
    console.log(`\nCreating: ${userMap.newEmail}`);
    console.log(`  Name: ${userMap.full_name}`);
    console.log(`  Role: ${userMap.role}`);
    console.log(`  Tenant: ${userMap.tenant_id}`);
    
    try {
      // Create user via Supabase Admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: userMap.newEmail,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          full_name: userMap.full_name,
          role: userMap.role,
          tenant_id: userMap.tenant_id
        }
      });
      
      if (error) {
        // Check if user already exists
        if (error.message.includes('already been registered')) {
          console.log(`  ⚠️  User already exists, updating password...`);
          
          // Get existing user
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users?.users?.find(u => u.email === userMap.newEmail);
          
          if (existingUser) {
            // Update password
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { 
                password: 'password123',
                user_metadata: {
                  full_name: userMap.full_name,
                  role: userMap.role,
                  tenant_id: userMap.tenant_id
                }
              }
            );
            
            if (updateError) {
              console.error(`  ❌ Error updating:`, updateError.message);
              errorCount++;
            } else {
              console.log(`  ✅ Updated successfully`);
              console.log(`  ID: ${existingUser.id}`);
              createdUsers.push({
                id: existingUser.id,
                oldEmail: userMap.oldEmail,
                newEmail: userMap.newEmail,
                full_name: userMap.full_name,
                role: userMap.role,
                tenant_id: userMap.tenant_id
              });
              successCount++;
            }
          }
        } else {
          console.error(`  ❌ Error:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`  ✅ Created successfully`);
        console.log(`  ID: ${data.user?.id}`);
        createdUsers.push({
          id: data.user?.id,
          oldEmail: userMap.oldEmail,
          newEmail: userMap.newEmail,
          full_name: userMap.full_name,
          role: userMap.role,
          tenant_id: userMap.tenant_id
        });
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Exception:`, err.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  ✅ Successfully created/updated: ${successCount} users`);
  console.log(`  ❌ Failed: ${errorCount} users`);
  console.log('=' + '='.repeat(60));
  
  // Generate SQL migration to update user_profiles
  if (createdUsers.length > 0) {
    console.log('\nGenerating SQL migration to update user_profiles...\n');
    
    const migrationSQL = `-- =============================================
-- Migration 015: Update Profiles with New Auth User IDs
-- =============================================
-- This migration updates user_profiles to use the new simplified email format

DO $$
DECLARE
    updated_count INTEGER := 0;
    total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating user_profiles with new auth user IDs and emails...';
    RAISE NOTICE '';
    
${createdUsers.map(user => `    -- Update profile for ${user.oldEmail} -> ${user.newEmail}
    UPDATE user_profiles 
    SET 
        user_id = '${user.id}'::uuid,
        email = '${user.newEmail}',
        updated_at = now()
    WHERE email = '${user.oldEmail}';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: ${user.oldEmail} -> ${user.newEmail}';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for ${user.oldEmail}';
    END IF;
`).join('\n')}
    
    RAISE NOTICE '';
    RAISE NOTICE '=' || REPEAT('=', 59);
    RAISE NOTICE 'Total profiles updated: %', total_updated;
    RAISE NOTICE '✅ User profiles have been updated with new emails and auth IDs';
    RAISE NOTICE '✅ All users can now login with:';
    RAISE NOTICE '   - New email format (e.g., ceo@siga.com)';
    RAISE NOTICE '   - Password: password123';
    RAISE NOTICE '=' || REPEAT('=', 59);
END $$;`;
    
    // Save the migration
    const fs = require('fs');
    const migrationPath = 'supabase/migrations/20240101000015_update_profiles_new_emails.sql';
    fs.writeFileSync(migrationPath, migrationSQL);
    console.log(`Migration saved to: ${migrationPath}`);
    console.log('\nRun this command to apply the migration:');
    console.log('npx supabase db push --linked --password "bWSg6ONuXWdZsDVP"');
  }
  
  // Test login with first user
  if (createdUsers.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('Testing login with ceo@siga.com...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'ceo@siga.com',
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
}

createSimplifiedUsers().catch(console.error);