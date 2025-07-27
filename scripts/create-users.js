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

// Generate secure random password
function generateSecurePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Users to create (passwords will be auto-generated)
const users = [
  {
    email: 'admin@stratix-platform.com',
    user_metadata: {
      full_name: 'Admin Stratix',
      role: 'admin'
    },
    email_confirm: true
  },
  {
    email: 'manager@stratix-platform.com',
    user_metadata: {
      full_name: 'Manager Stratix',
      role: 'manager'
    },
    email_confirm: true
  },
  {
    email: 'analyst@stratix-platform.com',
    user_metadata: {
      full_name: 'Analyst Stratix',
      role: 'analyst'
    },
    email_confirm: true
  },
  {
    email: 'admin@fema-electricidad.com',
    user_metadata: {
      full_name: 'Admin FEMA',
      role: 'admin'
    },
    email_confirm: true
  },
  {
    email: 'manager@fema-electricidad.com',
    user_metadata: {
      full_name: 'Gerente División Industrial',
      role: 'manager'
    },
    email_confirm: true
  },
  {
    email: 'analyst@fema-electricidad.com',
    user_metadata: {
      full_name: 'Analista Comercial',
      role: 'analyst'
    },
    email_confirm: true
  },
  {
    email: 'admin@siga-turismo.com',
    user_metadata: {
      full_name: 'Admin SIGA',
      role: 'admin'
    },
    email_confirm: true
  },
  {
    email: 'manager@siga-turismo.com',
    user_metadata: {
      full_name: 'Director de Desarrollo',
      role: 'manager'
    },
    email_confirm: true
  },
  {
    email: 'analyst@siga-turismo.com',
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
  console.log('🔐 Generating secure passwords for each user...\n');
  
  let successCount = 0;
  let errorCount = 0;
  const createdUsers = [];
  
  for (const userData of users) {
    console.log(`Creating user: ${userData.email}`);
    
    // Generate secure password for this user
    const password = generateSecurePassword();
    
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: password,
        user_metadata: userData.user_metadata,
        email_confirm: userData.email_confirm
      });
      
      if (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Success: ${userData.email} (ID: ${data.user.id})`);
        console.log(`  🔑 Password: ${password}`);
        createdUsers.push({
          email: userData.email,
          password: password,
          user_id: data.user.id
        });
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
    console.log('\n📋 Created User Credentials:');
    console.log('='.repeat(50));
    createdUsers.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`User ID: ${user.user_id}`);
      console.log('-'.repeat(30));
    });
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('Passwords are only shown once and cannot be recovered.');
    console.log('\nYou can now run the complete-data-setup.sql script to create user profiles.');
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
