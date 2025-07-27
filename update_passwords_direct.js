// Update demo user passwords using Supabase Admin API - direct approach
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
    // Try updating each user by email using the admin update endpoint
    for (const email of demoEmails) {
      console.log(`Attempting to update password for: ${email}`);
      
      try {
        // First try to find user by email using the REST API
        const searchResponse = await fetch(`${supabaseUrl}/rest/v1/auth.users?email=eq.${email}&select=id,email`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        });

        if (searchResponse.ok) {
          const userData = await searchResponse.json();
          if (userData && userData.length > 0) {
            const userId = userData[0].id;
            console.log(`Found user ${email} with ID: ${userId}`);
            
            // Update the user's password
            const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
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
              console.log(`✓ Successfully updated password for ${email}`);
            } else {
              const errorText = await updateResponse.text();
              console.error(`✗ Failed to update ${email}: ${updateResponse.status} - ${errorText}`);
            }
          } else {
            console.log(`⚠ User not found: ${email}`);
          }
        } else {
          console.error(`✗ Failed to search for ${email}: ${searchResponse.status}`);
        }
        
      } catch (userError) {
        console.error(`✗ Error processing ${email}:`, userError.message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n✅ Demo user password update process completed!');
    console.log(`Demo users should now be able to login with password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Failed to update passwords:', error);
  }
}

// Run the update
updateDemoPasswords();