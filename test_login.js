// Test login API call
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing superadmin login API...');
    
    const response = await fetch('http://localhost:3000/api/superadmin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-client'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'btcStn60'
      })
    });
    
    const result = await response.text();
    
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 200) {
      console.log('✅ LOGIN SUCCESS!');
    } else {
      console.log('❌ LOGIN FAILED:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testLogin();