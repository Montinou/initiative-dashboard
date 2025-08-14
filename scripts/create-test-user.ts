import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('Creating test user...');
  
  // Create user in auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'test123456',
    email_confirm: true
  });
  
  if (authError) {
    console.error('Error creating auth user:', authError);
    return;
  }
  
  console.log('Created auth user:', authUser.user?.id);
  
  // Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: uuidv4(),
      user_id: authUser.user?.id,
      tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // SIGA tenant
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'CEO',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (profileError) {
    console.error('Error creating profile:', profileError);
    return;
  }
  
  console.log('✅ Test user created successfully!');
  console.log('Email: test@example.com');
  console.log('Password: test123456');
}

createTestUser().catch(console.error);