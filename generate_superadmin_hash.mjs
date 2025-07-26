// Generate the correct PBKDF2 hash for superadmin password
// Run with: node generate_superadmin_hash.mjs

import { webcrypto } from 'crypto';

// Polyfill for Node.js environments that don't have global crypto
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

async function generatePasswordHash(password) {
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

async function main() {
  const password = 'btcStn60';
  
  console.log('🔐 Generating PBKDF2 hash for password:', password);
  
  // Generate new hash
  const newHash = await generatePasswordHash(password);
  console.log('\n📝 Generated Hash:');
  console.log(newHash);
  console.log('\n📏 Hash Length:', newHash.length);
  
  // Test the existing hash
  const existingHash = 'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2';
  console.log('\n🔍 Testing existing hash:');
  console.log('Existing Hash:', existingHash);
  console.log('Existing Hash Length:', existingHash.length);
  
  const isValidExisting = await verifyPassword(password, existingHash);
  console.log('✅ Existing Hash Valid:', isValidExisting);
  
  const isValidNew = await verifyPassword(password, newHash);
  console.log('✅ New Hash Valid:', isValidNew);
  
  console.log('\n📋 SQL Statement to update superadmin:');
  console.log(`UPDATE public.superadmins 
SET password_hash = '${newHash}',
    updated_at = timezone('utc'::text, now())
WHERE email = 'agusmontoya@gmail.com';`);
}

main().catch(console.error);