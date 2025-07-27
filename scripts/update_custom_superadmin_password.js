require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const newSuperadminPassword = 'btcStn60';

// Hash password using Web Crypto API (same as edge-compatible-auth.ts)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Use PBKDF2 for password hashing
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  // Combine salt and hash
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

async function updateCustomSuperadminPassword() {
  console.log('🔐 Updating custom superadmin password to btcStn60...\n');

  try {
    // Get all superadmins from the custom table
    const { data: superadmins, error: fetchError } = await supabase
      .from('superadmins')
      .select('id, email, name, is_active')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Failed to fetch superadmins:', fetchError.message);
      return;
    }

    if (!superadmins || superadmins.length === 0) {
      console.log('⚠️  No active superadmins found in custom table');
      return;
    }

    console.log(`Found ${superadmins.length} active superadmin(s):\n`);
    
    superadmins.forEach(admin => {
      console.log(`- ${admin.email} (${admin.name}) - ID: ${admin.id}`);
    });

    console.log('\n');

    // Generate new password hash
    console.log('Generating new password hash...');
    const newPasswordHash = await hashPassword(newSuperadminPassword);
    console.log('✅ Password hash generated\n');

    // Update each superadmin's password
    for (const admin of superadmins) {
      console.log(`Updating password for: ${admin.email}`);
      
      try {
        const { error: updateError } = await supabase
          .from('superadmins')
          .update({ 
            password_hash: newPasswordHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', admin.id);

        if (updateError) {
          console.error(`  ❌ Failed to update ${admin.email}: ${updateError.message}`);
        } else {
          console.log(`  ✅ Successfully updated password for ${admin.email}`);
        }

      } catch (error) {
        console.error(`  💥 Unexpected error for ${admin.email}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

  } catch (error) {
    console.error('❌ Failed to update superadmin passwords:', error);
  }
}

async function testSuperadminAPI() {
  console.log('\n🧪 Testing superadmin login via API...\n');
  
  try {
    // Get a superadmin email to test
    const { data: superadmins, error: fetchError } = await supabase
      .from('superadmins')
      .select('email')
      .eq('is_active', true)
      .limit(1);

    if (fetchError || !superadmins || superadmins.length === 0) {
      console.log('⚠️  No superadmin found for testing');
      return;
    }

    const testEmail = superadmins[0].email;
    console.log(`Testing login for: ${testEmail}`);
    
    // Test login via the superadmin API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('supabase.co', 'vercel.app')}/api/superadmin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: newSuperadminPassword
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Superadmin API login successful!`);
      console.log(`  ✅ Logged in as: ${data.superadmin?.name} (${data.superadmin?.email})`);
    } else {
      const errorData = await response.json();
      console.error(`  ❌ API login failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error(`  💥 Test error: ${error.message}`);
  }
}

async function main() {
  try {
    await updateCustomSuperadminPassword();
    await testSuperadminAPI();
    
    console.log('\n🎉 Custom superadmin password update complete!\n');
    console.log(`📋 Superadmins can now login with password: ${newSuperadminPassword}`);
    console.log('🌐 Use the superadmin login page: /superadmin/login');
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    process.exit(1);
  }
}

main();