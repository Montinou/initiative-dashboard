#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsers() {
  console.log('Checking users in the database...\n');
  
  // Check user_profiles
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  console.log('User Profiles found:', profiles?.length || 0);
  if (profiles && profiles.length > 0) {
    console.log('\nSample users:');
    profiles.forEach(p => {
      console.log(`  - ${p.email} (${p.role}) - Tenant: ${p.tenant_id}`);
    });
  }
  
  // Check if we can create a test user
  console.log('\nCreating a test user for API testing...');
  
  // First, get a tenant ID
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, subdomain')
    .limit(1);
  
  if (!tenants || tenants.length === 0) {
    console.error('No tenants found in database');
    return;
  }
  
  const testTenant = tenants[0];
  console.log(`Using tenant: ${testTenant.subdomain} (${testTenant.id})`);
  
  // Try to create a test user
  const testEmail = 'api-test@example.com';
  const testPassword = 'Test123456!';
  
  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });
  
  if (authError && !authError.message.includes('already been registered')) {
    console.error('Error creating auth user:', authError);
    return;
  }
  
  if (authUser) {
    console.log('Auth user created:', authUser.user?.id);
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: authUser.user?.id,
        email: testEmail,
        full_name: 'API Test User',
        role: 'CEO',
        tenant_id: testTenant.id
      }, {
        onConflict: 'user_id'
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
    } else {
      console.log('✅ Test user created successfully');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword}`);
    }
  } else {
    console.log('User might already exist, trying to use existing credentials');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
  }
}

checkUsers().catch(console.error);