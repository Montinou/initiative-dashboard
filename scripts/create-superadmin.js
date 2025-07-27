const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Edge-compatible password hashing (same as edge-compatible-auth.ts)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Generate a random salt
  const salt = crypto.randomBytes(16);
  
  // Use PBKDF2 for password hashing
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  // Combine salt and hash
  const combined = Buffer.concat([salt, derivedKey]);
  
  // Convert to base64
  return combined.toString('base64');
}

async function createSuperadmin() {
  try {
    const email = 'superadmin@stratix-platform.com';
    const password = 'password123';
    const name = 'Platform Superadmin';
    
    console.log('Creating superadmin with email:', email);
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    console.log('Password hashed successfully');
    
    // Insert into superadmins table
    const { data, error } = await supabase
      .from('superadmins')
      .insert({
        email,
        name,
        password_hash: passwordHash,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log('Superadmin already exists, updating password...');
        
        // Update existing superadmin
        const { data: updatedData, error: updateError } = await supabase
          .from('superadmins')
          .update({
            password_hash: passwordHash,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        console.log('Superadmin password updated successfully');
        console.log('Superadmin ID:', updatedData.id);
      } else {
        throw error;
      }
    } else {
      console.log('Superadmin created successfully');
      console.log('Superadmin ID:', data.id);
    }
    
    console.log('\nSuperadmin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    
    // Also create/update in auth.users for consistency
    console.log('\nCreating auth.users entry...');
    
    // First, check if user exists in auth.users
    const { data: authUser, error: authCheckError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (!authUser && !authCheckError) {
      // Create new auth user
      const { error: authError } = await supabase
        .from('auth.users')
        .insert({
          id: 'd1111111-1111-1111-1111-111111111111',
          instance_id: '00000000-0000-0000-0000-000000000000',
          aud: 'authenticated',
          role: 'authenticated',
          email: email,
          encrypted_password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // bcrypt hash for password123
          email_confirmed_at: new Date().toISOString(),
          raw_app_meta_data: { provider: 'email', providers: ['email'] },
          raw_user_meta_data: { full_name: name },
          is_super_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_sso_user: false
        });
      
      if (authError && authError.code !== '23505') {
        console.error('Error creating auth.users entry:', authError);
      } else {
        console.log('auth.users entry created');
      }
    }
    
    // Create/update user_profiles entry
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: 'd1111111-1111-1111-1111-111111111111',
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
      console.error('Error creating user_profiles entry:', profileError);
    } else {
      console.log('user_profiles entry created/updated');
    }
    
    console.log('\nSuperadmin setup complete!');
    
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
}

// Run the script
createSuperadmin();