#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing environment variables');
  console.error('Please create a .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('See .env.example for reference');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Users to create
const users = [
  {
    email: 'admin@stratix-platform.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Admin Stratix',
      role: 'admin'
    },
    email_confirm: true
  },
  {
    email: 'manager@stratix-platform.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Manager Stratix',
      role: 'manager'
    },
    email_confirm: true
  },
  {
    email: 'analyst@stratix-platform.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Analyst Stratix',
      role: 'analyst'
    },
    email_confirm: true
  },
  {
    email: 'admin@fema-electricidad.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Admin FEMA',
      role: 'admin'
    },
    email_confirm: true
  },
  {
    email: 'manager@fema-electricidad.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Gerente División Industrial',
      role: 'manager'
    },
    email_confirm: true
  },
  {
    email: 'analyst@fema-electricidad.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Analista Comercial',
      role: 'analyst'
    },
    email_confirm: true
  },
  {
    email: 'admin@siga-turismo.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Admin SIGA',
      role: 'admin'
    },
    email_confirm: true
  },
  {
    email: 'manager@siga-turismo.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Director de Desarrollo',
      role: 'manager'
    },
    email_confirm: true
  },
  {
    email: 'analyst@siga-turismo.com',
    password: 'StrongPassword123!',
    user_metadata: {
      full_name: 'Analista de Marketing',
      role: 'analyst'
    },
    email_confirm: true
  },
  {
    email: 'superadmin@stratix-platform.com',
    password: 'SuperAdminPassword123!',
    user_metadata: {
      full_name: 'Platform Superadmin',
      role: 'superadmin'
    },
    email_confirm: true
  }
];

async function createUsers() {
  console.log('🚀 Starting user creation with Supabase Admin API...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const userData of users) {
    console.log(`Creating user: ${userData.email}`);
    
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: userData.user_metadata,
        email_confirm: userData.email_confirm
      });
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Success: ${userData.email} (ID: ${data.user.id})`);
        successCount++;
      }
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
      errorCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed: ${errorCount} users`);
  
  if (successCount > 0) {
    console.log('\n🎉 User creation completed!');
    console.log('You can now run the complete-data-setup.sql script to create user profiles.');
  } else {
    console.log('\n⚠️  No users were created successfully.');
    console.log('Please check your Supabase configuration and try again.');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
createUsers().catch(console.error);
