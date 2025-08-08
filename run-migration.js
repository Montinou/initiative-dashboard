const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running migration to link auth users to profiles...\n');
  
  const userMappings = [
    { email: 'admin_siga@example.com', userId: 'c6b7870b-33f6-46a7-a0e6-cb15e4c9f2f1' }
  ];
  
  for (const mapping of userMappings) {
    console.log(`Updating profile for ${mapping.email}...`);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        user_id: mapping.userId,
        updated_at: new Date().toISOString()
      })
      .eq('email', mapping.email);
    
    if (error) {
      console.error(`  ❌ Error updating ${mapping.email}:`, error.message);
    } else {
      console.log(`  ✅ Successfully updated ${mapping.email}`);
    }
  }
  
  console.log('\n✅ Migration completed!');
}

runMigration().catch(console.error);