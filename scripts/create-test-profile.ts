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

async function createTestProfile() {
  console.log('Creating profile for test@example.com...');
  
  // The user ID from the auth user we created
  const userId = 'c6fefae7-0b30-4b6d-88ab-e39cd83c8818';
  
  // First check if profile already exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (existing) {
    console.log('Profile already exists:', existing);
    return;
  }
  
  // Create user profile
  const { data, error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: uuidv4(),
      user_id: userId,
      tenant_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // SIGA tenant
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'CEO',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (profileError) {
    console.error('Error creating profile:', profileError);
    return;
  }
  
  console.log('✅ Profile created successfully!');
  console.log('Profile data:', data);
}

createTestProfile().catch(console.error);