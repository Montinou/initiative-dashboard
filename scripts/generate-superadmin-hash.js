const crypto = require('crypto');

// This generates a password hash compatible with edge-compatible-auth.ts
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

// Generate hash for password123
const password = 'password123';
const hash = generatePasswordHash(password);

console.log('Password Hash Generator for Superadmin');
console.log('=====================================');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nUse this hash in the password_hash field of the superadmins table');
console.log('\nSQL to insert superadmin:');
console.log(`
INSERT INTO public.superadmins (
  email,
  name,
  password_hash,
  is_active
) VALUES (
  'superadmin@stratix-platform.com',
  'Platform Superadmin',
  '${hash}',
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
`);