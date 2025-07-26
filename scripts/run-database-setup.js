// Node.js script to run database setup
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting FEMA database setup...\n');

// Change to project directory
const projectDir = path.join(__dirname, '..');
process.chdir(projectDir);

// Compile TypeScript and run setup
const setupCommand = `npx tsx scripts/database-setup.ts`;

console.log('📦 Compiling and executing database setup...');

exec(setupCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Setup failed:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️ Setup warnings:', stderr);
  }
  
  console.log(stdout);
  console.log('\n✅ Database setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('  1. Check the users created in your Supabase dashboard');
  console.log('  2. Verify the initiatives data');
  console.log('  3. Test the chart components with real data');
  console.log('  4. Set up authentication for user login');
});

// Also create a simpler setup runner
async function runSetup() {
  try {
    // Import and run the setup
    const { databaseSetup } = await import('./database-setup.js');
    const result = await databaseSetup.setupComplete();
    
    console.log('\n🎯 Setup Results:');
    console.log(`  • Tenant: ${result.tenant_id}`);
    console.log(`  • Areas: ${result.areas.length}`);
    console.log(`  • Users: ${result.users.length}`);
    console.log(`  • Initiatives: ${result.initiatives.length}`);
    
    // Show users by role
    await databaseSetup.getUsersByRole();
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// If running directly, execute setup
if (require.main === module) {
  runSetup();
}