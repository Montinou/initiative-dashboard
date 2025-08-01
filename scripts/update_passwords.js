const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
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

async function updateDemoPasswords() {
  console.log('Starting password update for demo users...');
  
  // New bcrypt hash for Password123!
  const newPasswordHash = '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i';
  
  // Demo user emails (excluding superadmin)
  const demoEmails = [
    'ceo@siga.com',
    'admin@siga.com', 
    'manager@siga.com',
    'analyst@siga.com',
    'ceo@fema.com',
    'admin@fema.com',
    'manager@fema.com', 
    'analyst@fema.com',
    'ceo@stratix.com',
    'admin@stratix.com',
    'manager@stratix.com',
    'analyst@stratix.com'
  ];

  try {
    // Update passwords for demo users
    const { data, error } = await supabase.rpc('update_demo_user_passwords', {
      demo_emails: demoEmails,
      new_password_hash: newPasswordHash
    });

    if (error) {
      // If RPC doesn't exist, try direct SQL update
      console.log('RPC not found, trying direct update...');
      
      for (const email of demoEmails) {
        console.log(`Updating password for: ${email}`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('auth.users')
          .update({ 
            encrypted_password: newPasswordHash,
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) {
          console.error(`Error updating ${email}:`, updateError);
        } else {
          console.log(`✓ Updated ${email}`);
        }
      }
    } else {
      console.log('✓ Updated all demo user passwords via RPC');
    }

    // Verify the changes
    console.log('\nVerifying password updates...');
    const { data: users, error: verifyError } = await supabase
      .from('auth.users')
      .select('email, encrypted_password, updated_at')
      .in('email', demoEmails);

    if (verifyError) {
      console.error('Error verifying updates:', verifyError);
    } else {
      users.forEach(user => {
        const passwordStatus = user.encrypted_password === newPasswordHash ? 'Password123!' : 'Other password';
        console.log(`${user.email}: ${passwordStatus} (updated: ${user.updated_at})`);
      });
    }

  } catch (error) {
    console.error('Failed to update passwords:', error);
  }
}

// Run the update
updateDemoPasswords();