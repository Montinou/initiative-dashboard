require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSingleUser() {
  console.log('🎯 Creating single FEMA CEO user...');
  
  const userEmail = 'ceo@fema-electricidad.com';
  const userPassword = 'password123';
  const tenantId = 'c5a4dd96-6058-42b3-8268-997728a529bb';
  
  try {
    // Step 1: Create auth user using the working method
    console.log('Creating auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'CEO FEMA',
        role: 'CEO'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Step 2: Create user profile
    console.log('Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        tenant_id: tenantId,
        email: userEmail,
        full_name: 'CEO FEMA',
        role: 'CEO',
        area: 'Executive',
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message);
      return;
    }

    console.log('✅ Profile created:', profile.id);

    // Step 3: Test login
    console.log('Testing login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    });

    if (loginError) {
      console.error('❌ Login test failed:', loginError.message);
    } else {
      console.log('✅ Login successful!');
      console.log('User:', loginData.user.email);
      console.log('Session:', !!loginData.session);
      
      // Test profile fetch
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', loginData.user.id)
        .single();
        
      if (fetchError) {
        console.error('❌ Profile fetch failed:', fetchError.message);
      } else {
        console.log('✅ Profile fetched:', fetchedProfile.full_name, fetchedProfile.role);
      }
      
      await supabase.auth.signOut();
    }

    console.log('\\n🎉 FEMA CEO user ready!');
    console.log('Email: ceo@fema-electricidad.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

createSingleUser();