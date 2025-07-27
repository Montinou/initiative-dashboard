async function testSuperadminLogin() {
  const email = 'superadmin@stratix-platform.com';
  const password = 'password123';
  
  console.log('Testing superadmin login...');
  console.log('Email:', email);
  console.log('Password:', password);
  
  try {
    const response = await fetch('http://localhost:3000/api/superadmin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✓ Login successful!');
      console.log('Superadmin ID:', data.superadmin?.id);
      console.log('Superadmin Name:', data.superadmin?.name);
      console.log('Superadmin Email:', data.superadmin?.email);
      
      // Check cookies
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        console.log('\nSession cookie set:', cookies.includes('superadmin-session'));
      }
    } else {
      console.log('\n✗ Login failed');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('\nConnection error:', error.message);
    console.log('Make sure the development server is running on http://localhost:3000');
  }
}

testSuperadminLogin();