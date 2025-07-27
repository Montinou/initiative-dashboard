// Setup script to create superadmin user with proper hash
// Run: node setup-superadmin.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables manually
function loadEnv() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^"|"$/g, '');
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.error('Could not load .env.local:', error.message);
  }
}

loadEnv();

// Supabase client with service role
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

// Web Crypto API password hashing (same as in edge-compatible-auth.ts)
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

async function setupSuperadmin() {
  try {
    console.log('Setting up superadmin user...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const email = 'admin@example.com';
    const password = 'btcStn60';
    const name = 'System Administrator';
    
    // Hash the password
    console.log('Generating password hash...');
    const passwordHash = await hashPassword(password);
    console.log('Password hash generated, length:', passwordHash.length);
    
    // Delete existing superadmin if any
    console.log('Cleaning up existing superadmin...');
    const { error: deleteError } = await supabaseAdmin
      .from('superadmins')
      .delete()
      .eq('email', email);
    
    if (deleteError) {
      console.log('No existing superadmin to delete or error:', deleteError.message);
    }
    
    // Create new superadmin
    console.log('Creating new superadmin...');
    const { data, error } = await supabaseAdmin
      .from('superadmins')
      .insert({
        email,
        name,
        password_hash: passwordHash,
        is_active: true
      })
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Failed to create superadmin: ${error.message}`);
    }
    
    console.log('✅ Superadmin created successfully!');
    console.log('- ID:', data.id);
    console.log('- Email:', data.email);
    console.log('- Name:', data.name);
    console.log('- Active:', data.is_active);
    console.log('');
    console.log('🔑 Login credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('');
    console.log('Test with: POST /api/superadmin/auth/login');
    
  } catch (error) {
    console.error('❌ Error setting up superadmin:', error.message);
    console.error('Stack:', error.stack);
  }
}

setupSuperadmin();