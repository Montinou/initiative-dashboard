// Create first superadmin with proper password hashing
// This uses the same PBKDF2 method as our edge-compatible-auth.ts

const crypto = require('crypto');

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16);
    
    // Use PBKDF2 for password hashing (same as Web Crypto API version)
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Combine salt and hash
      const combined = Buffer.concat([salt, derivedKey]);
      
      // Convert to base64 (same format as Web Crypto API version)
      const hash = combined.toString('base64');
      resolve(hash);
    });
  });
}

async function main() {
  const email = 'agusmontoya@gmail.com';
  const password = 'btcStn60';
  const name = 'Agus Montoya - Platform Administrator';
  
  try {
    const passwordHash = await hashPassword(password);
    
    console.log('-- Create first superadmin user');
    console.log('-- Email:', email);
    console.log('-- Password: btcStn60');
    console.log('');
    console.log('INSERT INTO public.superadmins (email, name, password_hash) VALUES (');
    console.log(`    '${email}',`);
    console.log(`    '${name}',`);
    console.log(`    '${passwordHash}'`);
    console.log(');');
    console.log('');
    console.log('-- Verify the superadmin was created');
    console.log('SELECT id, email, name, is_active, created_at');
    console.log('FROM public.superadmins');
    console.log(`WHERE email = '${email}';`);
    
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}

main();