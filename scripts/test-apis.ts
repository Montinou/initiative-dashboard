#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzI4NDgsImV4cCI6MjA2NjU0ODg0OH0.GUqHaOFH7TVWmKQrGlk-zJ8Sr-uovOPU3fLEtIfbk1k';
const BASE_URL = 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function authenticate() {
  console.log('🔐 Authenticating...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'api-test@example.com',
    password: 'Test123456!'
  });
  
  if (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
  
  const session = data.session;
  if (!session) {
    throw new Error('No session returned');
  }
  
  console.log('✅ Authenticated successfully');
  return session.access_token;
}

async function testAPI(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🧪 Testing ${method} ${endpoint}`);
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
    
    const result: TestResult = {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      data: data
    };
    
    if (!response.ok) {
      result.error = typeof data === 'object' ? data.error : data;
      console.log(`  ❌ Failed: ${response.status} - ${result.error}`);
    } else {
      console.log(`  ✅ Success: ${response.status}`);
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        console.log(`  📦 Response keys: ${keys.join(', ')}`);
      }
    }
    
    results.push(result);
    return result;
  } catch (error) {
    const result: TestResult = {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    console.log(`  ❌ Error: ${result.error}`);
    results.push(result);
    return result;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests\n');
  console.log('================================\n');
  
  let token: string;
  
  try {
    token = await authenticate();
  } catch (error) {
    console.error('Failed to authenticate. Exiting tests.');
    return;
  }
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n📋 Testing Core APIs\n');
  console.log('================================');
  
  // 1. Health Check
  await testAPI('/api/health', 'GET');
  
  // 2. Authentication & Profile APIs
  console.log('\n🔐 Authentication & Profile APIs');
  await testAPI('/api/profile/user', 'GET', null, token);
  await testAPI('/api/debug/auth', 'GET', null, token);
  await testAPI('/api/debug/user-profile', 'GET', null, token);
  
  // 3. Dashboard APIs
  console.log('\n📊 Dashboard APIs');
  await testAPI('/api/dashboard/overview', 'GET', null, token);
  await testAPI('/api/dashboard/kpi-data', 'GET', null, token);
  await testAPI('/api/dashboard/analytics', 'GET', null, token);
  await testAPI('/api/dashboard/initiatives', 'GET', null, token);
  await testAPI('/api/dashboard/areas', 'GET', null, token);
  await testAPI('/api/dashboard/objectives', 'GET', null, token);
  await testAPI('/api/dashboard/area-comparison', 'GET', null, token);
  await testAPI('/api/dashboard/progress-distribution', 'GET', null, token);
  await testAPI('/api/dashboard/status-distribution', 'GET', null, token);
  await testAPI('/api/dashboard/trend-analytics', 'GET', null, token);
  
  // 4. Core Entity APIs
  console.log('\n🎯 Core Entity APIs');
  await testAPI('/api/objectives', 'GET', null, token);
  await testAPI('/api/initiatives', 'GET', null, token);
  await testAPI('/api/areas', 'GET', null, token);
  await testAPI('/api/activities', 'GET', null, token);
  await testAPI('/api/users', 'GET', null, token);
  await testAPI('/api/organizations', 'GET', null, token);
  
  // 5. Analytics APIs
  console.log('\n📈 Analytics APIs');
  await testAPI('/api/analytics', 'GET', null, token);
  await testAPI('/api/analytics/kpi', 'GET', null, token);
  await testAPI('/api/analytics/trends', 'GET', null, token);
  await testAPI('/api/analytics/performance', 'GET', null, token);
  
  // 6. Progress Tracking
  console.log('\n📊 Progress Tracking APIs');
  await testAPI('/api/progress-tracking', 'GET', null, token);
  
  // 7. Audit Log
  console.log('\n📝 Audit Log APIs');
  await testAPI('/api/audit-log', 'GET', null, token);
  
  // 8. Manager Dashboard
  console.log('\n👥 Manager Dashboard APIs');
  await testAPI('/api/manager-dashboard', 'GET', null, token);
  await testAPI('/api/manager/area-summary', 'GET', null, token);
  await testAPI('/api/manager/initiatives', 'GET', null, token);
  
  // 9. CEO Dashboard
  console.log('\n👔 CEO Dashboard APIs');
  await testAPI('/api/ceo/metrics', 'GET', null, token);
  
  // 10. Organization Admin APIs
  console.log('\n🏢 Organization Admin APIs');
  await testAPI('/api/org-admin/stats', 'GET', null, token);
  await testAPI('/api/org-admin/users', 'GET', null, token);
  await testAPI('/api/org-admin/areas', 'GET', null, token);
  await testAPI('/api/org-admin/invitations', 'GET', null, token);
  await testAPI('/api/org-admin/settings', 'GET', null, token);
  
  // Print Summary
  console.log('\n================================');
  console.log('📊 TEST SUMMARY\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed APIs:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}: ${r.status} - ${r.error}`);
    });
  }
  
  // Sign out
  await supabase.auth.signOut();
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(console.error);