require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Edge-compatible password hashing (same as edge-compatible-auth.ts)
function generatePasswordHash(password) {
  // Generate a random salt (16 bytes)
  const salt = crypto.randomBytes(16);
  
  // Use PBKDF2 for password hashing (same parameters as edge-compatible-auth.ts)
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  // Combine salt and hash
  const combined = Buffer.concat([salt, derivedKey]);
  
  // Convert to base64
  return combined.toString('base64');
}

async function setupSuperadmin() {
  try {
    const email = 'superadmin@stratix-platform.com';
    const password = 'password123';
    const name = 'Platform Superadmin';
    const userId = 'd1111111-1111-1111-1111-111111111111';
    
    console.log('Setting up superadmin with email:', email);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Step 1: Create/Update in superadmins table
    console.log('\n1. Creating entry in superadmins table...');
    const passwordHash = generatePasswordHash(password);
    
    // First try to update if exists
    const { data: existingSuper, error: checkError } = await supabase
      .from('superadmins')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingSuper) {
      console.log('Superadmin exists, updating password...');
      const { error: updateError } = await supabase
        .from('superadmins')
        .update({
          password_hash: passwordHash,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
      
      if (updateError) throw updateError;
      console.log('✓ Superadmin password updated');
    } else {
      console.log('Creating new superadmin...');
      const { error: insertError } = await supabase
        .from('superadmins')
        .insert({
          email,
          name,
          password_hash: passwordHash,
          is_active: true
        });
      
      if (insertError) throw insertError;
      console.log('✓ Superadmin created');
    }
    
    // Step 2: Note about auth.users
    console.log('\n2. Note: auth.users can only be modified through Supabase Dashboard or direct SQL');
    console.log('   Run the SQL script /database/create-superadmin.sql in Supabase Dashboard if needed');
    
    // Step 3: Create/Update user profile
    console.log('\n3. Creating entry in user_profiles...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        tenant_id: null,
        email: email,
        full_name: name,
        role: 'superadmin',
        area: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('Warning: Could not create user_profiles entry:', profileError.message);
    } else {
      console.log('✓ user_profiles entry created/updated');
    }
    
    // Step 4: Clean up any existing sessions
    console.log('\n4. Cleaning up existing sessions...');
    const { error: cleanupError } = await supabase
      .from('superadmin_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (!cleanupError) {
      console.log('✓ Cleaned up expired sessions');
    }
    
    console.log('\n=== SUPERADMIN SETUP COMPLETE ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Login URL: http://localhost:3000/superadmin');
    console.log('================================\n');
    
  } catch (error) {
    console.error('\nError setting up superadmin:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupSuperadmin();