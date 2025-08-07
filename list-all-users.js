// List all users visible through Supabase Admin API
const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listAllUsers() {
  console.log('Listing all users via Supabase Admin API...\n');
  
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total users: ${data.users?.length || 0}\n`);
  
  data.users?.forEach(user => {
    console.log('User:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Created: ${user.created_at}`);
    console.log(`  Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`  Metadata:`, user.user_metadata);
    console.log('---');
  });
}

listAllUsers().catch(console.error);