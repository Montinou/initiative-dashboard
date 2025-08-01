// Update demo user passwords using Supabase Admin API
const fs = require('fs');

async function updateDemoPasswords() {
  console.log('Starting password update for demo users via Supabase Admin API...');
  
  // Read environment variables from .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key] = value.replace(/"/g, '');
    }
  });
  
  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    return;
  }

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

  const newPassword = 'Password123!';

  try {
    // First, get all users to find their IDs
    console.log('Fetching user IDs...');
    console.log(`Using URL: ${supabaseUrl}/auth/v1/admin/users`);
    
    const getUsersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (!getUsersResponse.ok) {
      const errorText = await getUsersResponse.text();
      console.error(`Response status: ${getUsersResponse.status}`);
      console.error(`Response text: ${errorText}`);
      throw new Error(`Failed to fetch users: ${getUsersResponse.status} - ${errorText}`);
    }

    const usersData = await getUsersResponse.json();
    const users = usersData.users || [];
    
    console.log(`Found ${users.length} total users`);

    // Filter to demo users
    const demoUsers = users.filter(user => demoEmails.includes(user.email));
    console.log(`Found ${demoUsers.length} demo users to update`);

    // Update each demo user's password
    for (const user of demoUsers) {
      console.log(`Updating password for: ${user.email} (ID: ${user.id})`);
      
      const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPassword
        })
      });

      if (updateResponse.ok) {
        console.log(`✓ Successfully updated password for ${user.email}`);
      } else {
        const errorText = await updateResponse.text();
        console.error(`✗ Failed to update ${user.email}: ${updateResponse.status} - ${errorText}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Demo user password update completed!');
    console.log(`Demo users can now login with password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Failed to update passwords:', error);
  }
}

// Run the update
updateDemoPasswords();