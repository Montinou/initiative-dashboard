// Test the OKR API endpoint
const testOKRAPI = async () => {
  try {
    console.log('🧪 Testing OKR API...');
    
    const url = 'http://localhost:3000/api/okrs/departments?tenant_id=fema-electricidad';
    const response = await fetch(url);
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ API Success!');
      console.log('\n📊 Summary:');
      console.log(`- Total Departments: ${data.data.summary.totalDepartments}`);
      console.log(`- Total Initiatives: ${data.data.summary.totalInitiatives}`);
      console.log(`- Average Progress: ${data.data.summary.avgTenantProgress}%`);
      console.log(`- Critical Initiatives: ${data.data.summary.criticalInitiatives}`);
      
      console.log('\n🏢 Department Details:');
      data.data.departments.forEach(dept => {
        console.log(`\n• ${dept.name} ${dept.status}`);
        console.log(`  Progress: ${dept.progress}%`);
        console.log(`  Initiatives: ${dept.metrics.totalInitiatives} (${dept.metrics.completedInitiatives} completed)`);
        console.log(`  Critical: ${dept.metrics.criticalCount}`);
        
        if (dept.initiatives.length > 0) {
          console.log(`  Sample initiatives:`);
          dept.initiatives.slice(0, 2).forEach(init => {
            console.log(`    - ${init.name}: ${init.progress}% (${init.status})`);
          });
        }
      });
      
    } else {
      console.error('❌ API returned error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Next.js dev server is running (npm run dev)');
    console.log('2. Database schema is deployed');
    console.log('3. FEMA data is populated (node scripts/setup-fema-database.mjs)');
  }
};

testOKRAPI();