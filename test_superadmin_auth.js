// Test script to create superadmin user with Web Crypto hash and test authentication
// Run with: node test_superadmin_auth.js

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

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

// Verify password function (same as in edge-compatible-auth.ts)
async function verifyPassword(password, hash) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Decode the stored hash
    const combined = new Uint8Array(atob(hash).split('').map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    
    // Hash the provided password with the same salt
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

    const hashArray = new Uint8Array(derivedBits);
    
    // Compare hashes
    if (hashArray.length !== storedHash.length) {
      return false;
    }
    
    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHash[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

async function createSuperadmin() {
  try {
    const email = 'admin@example.com';
    const password = 'btcStn60';
    const name = 'System Administrator';
    
    console.log('Creating superadmin with Web Crypto hash...');
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    console.log('Generated password hash:', passwordHash.substring(0, 20) + '...');
    
    // Test the verification immediately
    const verificationTest = await verifyPassword(password, passwordHash);
    console.log('Hash verification test:', verificationTest ? 'PASS' : 'FAIL');
    
    // Delete existing superadmin if any
    await supabaseAdmin
      .from('superadmins')
      .delete()
      .eq('email', email);
    
    console.log('Deleted existing superadmin (if any)');
    
    // Create new superadmin
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
    
    console.log('✅ Superadmin created successfully:');
    console.log('- ID:', data.id);
    console.log('- Email:', data.email);
    console.log('- Name:', data.name);
    console.log('- Password:', password);
    console.log('- Hash length:', data.password_hash.length);
    
    // Test authentication
    console.log('\n🧪 Testing authentication...');
    
    const { data: authTest, error: authError } = await supabaseAdmin
      .from('superadmins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (authError || !authTest) {
      throw new Error('Failed to retrieve superadmin for auth test');
    }
    
    const passwordValid = await verifyPassword(password, authTest.password_hash);
    console.log('Password verification:', passwordValid ? '✅ VALID' : '❌ INVALID');
    
    if (passwordValid) {
      console.log('\n🎉 SUCCESS! You can now login with:');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      console.log('\n❌ FAILED! Password verification failed.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
createSuperadmin();