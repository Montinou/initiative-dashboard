import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with anon key (like the app does)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testCEOLogin() {
  console.log('🔐 Testing CEO Login...\n');
  console.log('Database URL:', SUPABASE_URL);
  console.log('=====================================\n');

  const testUsers = [
    { email: 'ceo_siga@example.com', password: process.env.TEST_PASSWORD || 'secure-temp-password-please-change', expectedRole: 'CEO' },
    { email: 'admin_siga@example.com', password: process.env.TEST_PASSWORD || 'secure-temp-password-please-change', expectedRole: 'Admin' },
    { email: 'manager_com@siga.com', password: process.env.TEST_PASSWORD || 'secure-temp-password-please-change', expectedRole: 'Manager' }
  ];

  for (const testUser of testUsers) {
    console.log(`\n📧 Testing: ${testUser.email}`);
    console.log('-----------------------------------');

    try {
      // 1. Try to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      if (authError) {
        console.error(`  ❌ Login failed: ${authError.message}`);
        continue;
      }

      console.log(`  ✅ Login successful!`);
      console.log(`  Auth ID: ${authData.user?.id}`);

      // 2. Get the user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user?.id)
        .single();

      if (profileError) {
        console.error(`  ❌ Profile fetch failed: ${profileError.message}`);
      } else {
        console.log(`  ✅ Profile found:`);
        console.log(`     - Full Name: ${profile.full_name}`);
        console.log(`     - Role: ${profile.role}`);
        console.log(`     - Tenant ID: ${profile.tenant_id}`);
        console.log(`     - Active: ${profile.is_active}`);
        
        // Check if role matches expected
        if (profile.role === testUser.expectedRole) {
          console.log(`  ✅ Role matches expected: ${testUser.expectedRole}`);
        } else {
          console.log(`  ⚠️  Role mismatch! Expected: ${testUser.expectedRole}, Got: ${profile.role}`);
        }

        // 3. Check org-admin access
        const canAccessOrgAdmin = ['CEO', 'Admin'].includes(profile.role);
        console.log(`  🛡️  Org-Admin Access: ${canAccessOrgAdmin ? '✅ ALLOWED' : '❌ DENIED'}`);
      }

      // 4. Sign out
      await supabase.auth.signOut();
      console.log(`  ✅ Signed out`);

    } catch (error) {
      console.error(`  ❌ Unexpected error: ${error}`);
    }
  }

  console.log('\n=====================================');
  console.log('📊 TESTING COMPLETE\n');

  // Now let's check the profile-dropdown logic
  console.log('🔍 Verifying Profile Dropdown Logic:');
  console.log('-----------------------------------');
  console.log('The profile dropdown checks: canAccessCompanyProfile = ["CEO", "Admin"].includes(role)');
  console.log('This means:');
  console.log('  - CEO users: ✅ Will see "Org Admin" option');
  console.log('  - Admin users: ✅ Will see "Org Admin" option');
  console.log('  - Manager users: ❌ Will NOT see "Org Admin" option');
  console.log('  - Regular members: ❌ Will NOT see "Org Admin" option');
}

// Run test
testCEOLogin().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});