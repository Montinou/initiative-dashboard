#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'https://siga-turismo.vercel.app';
const EMAIL = 'ceo@siga.com';
const PASSWORD = 'Password123!';

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Step 1: Get CSRF token and session info
async function getSessionInfo() {
  console.log('🔍 Step 1: Getting session info...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/auth/login`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Set-Cookie headers:`, response.headers['set-cookie'] || 'None');
    
    return response.headers['set-cookie'] || [];
  } catch (error) {
    console.error('❌ Error getting session info:', error.message);
    return [];
  }
}

// Step 2: Attempt login via Supabase Auth
async function attemptLogin(cookies = []) {
  console.log('\n🔐 Step 2: Attempting login...');
  
  // Try Supabase Auth API directly
  const supabaseUrl = 'https://zkkdnslupqnpioltjpeu.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzI4NDgsImV4cCI6MjA2NjU0ODg0OH0.GUqHaOFH7TVWmKQrGlk-zJ8Sr-uovOPU3fLEtIfbk1k';
  
  const loginPayload = JSON.stringify({
    email: EMAIL,
    password: PASSWORD
  });
  
  try {
    const response = await makeRequest(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: loginPayload
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      console.log('✅ Login successful!');
      console.log(`Access Token: ${response.data.access_token ? response.data.access_token.substring(0, 50) + '...' : 'None'}`);
      console.log(`Refresh Token: ${response.data.refresh_token ? response.data.refresh_token.substring(0, 50) + '...' : 'None'}`);
      console.log(`User ID: ${response.data.user?.id || 'None'}`);
      console.log(`User Email: ${response.data.user?.email || 'None'}`);
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        user: response.data.user
      };
    } else {
      console.log('❌ Login failed');
      console.log('Raw response:', response.rawData);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during login:', error.message);
    return null;
  }
}

// Step 3: Test API endpoints
async function testApiEndpoints(accessToken) {
  console.log('\n🧪 Step 3: Testing API endpoints...');
  
  const endpoints = [
    '/api/profile/user',
    '/api/okrs/departments', 
    '/api/dashboard/progress-distribution',
    '/api/dashboard/status-distribution',
    '/api/dashboard/area-comparison'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing ${endpoint}...`);
    
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('✅ Success!');
        if (response.data) {
          if (Array.isArray(response.data)) {
            console.log(`Data: Array with ${response.data.length} items`);
          } else if (typeof response.data === 'object') {
            console.log(`Data keys: ${Object.keys(response.data).join(', ')}`);
          } else {
            console.log(`Data: ${response.data}`);
          }
        }
      } else {
        console.log('❌ Failed');
        console.log('Response:', response.rawData);
      }
    } catch (error) {
      console.error(`❌ Error testing ${endpoint}:`, error.message);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting authentication flow test...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Email: ${EMAIL}`);
  console.log('='.repeat(50));
  
  // Step 1: Get session info
  const cookies = await getSessionInfo();
  
  // Step 2: Login
  const authResult = await attemptLogin(cookies);
  
  if (authResult && authResult.accessToken) {
    // Step 3: Test API endpoints
    await testApiEndpoints(authResult.accessToken);
  } else {
    console.log('\n❌ Cannot test API endpoints - login failed');
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the script
main().catch(console.error);