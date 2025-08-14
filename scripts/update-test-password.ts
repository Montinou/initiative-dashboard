import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updatePassword() {
  console.log('Updating password for test@example.com...');
  
  // Get list of users to find the user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  const user = users.find(u => u.email === 'test@example.com');
  
  if (!user) {
    console.error('User test@example.com not found');
    return;
  }
  
  // Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: 'test123456' }
  );
  
  if (updateError) {
    console.error('Error updating password:', updateError);
    return;
  }
  
  console.log('✅ Password updated successfully!');
  console.log('Email: test@example.com');
  console.log('Password: test123456');
}

updatePassword().catch(console.error);