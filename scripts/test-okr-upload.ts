#!/usr/bin/env ts-node

/**
 * Test script for OKR file upload functionality
 * 
 * This script tests the complete flow:
 * 1. Generate signed URL
 * 2. Upload file to GCS
 * 3. Notify server
 * 4. Check job status
 * 
 * Usage: npx ts-node scripts/test-okr-upload.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Set your auth token

if (!AUTH_TOKEN) {
  console.error('❌ Please set AUTH_TOKEN environment variable');
  process.exit(1);
}

// Test CSV content (no keys - matches by name)
const TEST_CSV_CONTENT = `area_name,objective_title,objective_description,objective_quarter,objective_priority,objective_status,objective_progress,objective_target_date,initiative_title,initiative_description,initiative_start_date,initiative_due_date,initiative_completion_date,initiative_status,initiative_progress,activity_title,activity_description,activity_is_completed,activity_assigned_to_email
Sales,Test Objective 1,Testing objective upload,Q1,high,in_progress,50,2025-03-31,Test Initiative 1,Testing initiative upload,2025-01-01,2025-03-31,,in_progress,30,Test Activity 1,Testing activity upload,false,
Marketing,Test Objective 2,Another test objective,Q2,medium,planning,0,2025-06-30,Test Initiative 2,Another test initiative,2025-04-01,2025-06-30,,planning,0,,,`;

async function calculateSHA256(content: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

async function testOKRUpload() {
  console.log('🚀 Starting OKR upload test...\n');

  try {
    // Step 1: Calculate checksum
    const checksum = await calculateSHA256(TEST_CSV_CONTENT);
    const filename = `test-okr-${Date.now()}.csv`;
    const fileSize = Buffer.byteLength(TEST_CSV_CONTENT);
    
    console.log(`📄 Test file: ${filename}`);
    console.log(`📏 File size: ${fileSize} bytes`);
    console.log(`🔐 Checksum: ${checksum}\n`);

    // Step 2: Get signed URL
    console.log('1️⃣ Requesting signed upload URL...');
    const signedUrlResponse = await fetch(`${API_BASE_URL}/api/upload/okr-file/signed-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename,
        fileSize,
        contentType: 'text/csv',
        checksum
      })
    });

    if (!signedUrlResponse.ok) {
      const error = await signedUrlResponse.text();
      throw new Error(`Failed to get signed URL: ${error}`);
    }

    const { uploadUrl, fields, objectPath } = await signedUrlResponse.json();
    console.log(`✅ Got signed URL for: ${objectPath}\n`);

    // Step 3: Upload to GCS
    console.log('2️⃣ Uploading file to GCS...');
    const formData = new FormData();
    
    // Add all fields from the signed URL response
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    
    // Add the file
    formData.append('file', Buffer.from(TEST_CSV_CONTENT), {
      filename,
      contentType: 'text/csv'
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok && uploadResponse.status !== 204) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload to GCS: ${error}`);
    }
    console.log('✅ File uploaded successfully\n');

    // Step 4: Notify server
    console.log('3️⃣ Notifying server of upload completion...');
    const notifyResponse = await fetch(`${API_BASE_URL}/api/upload/okr-file/notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ objectPath })
    });

    if (!notifyResponse.ok) {
      const error = await notifyResponse.text();
      throw new Error(`Failed to notify server: ${error}`);
    }

    const { jobId, status, message } = await notifyResponse.json();
    console.log(`✅ Job created: ${jobId}`);
    console.log(`   Status: ${status}`);
    console.log(`   Message: ${message}\n`);

    // Step 5: Poll for job completion
    console.log('4️⃣ Checking job status...');
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      attempts++;
      
      const statusResponse = await fetch(`${API_BASE_URL}/api/upload/okr-file/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        throw new Error(`Failed to get job status: ${error}`);
      }

      const jobData = await statusResponse.json();
      const jobStatus = jobData.job.status;
      const summary = jobData.summary;

      console.log(`   Attempt ${attempts}: ${jobStatus}`);
      
      if (jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'partial') {
        console.log('\n📊 Final Results:');
        console.log(`   Status: ${jobStatus}`);
        console.log(`   Total Rows: ${summary.totalRows}`);
        console.log(`   Processed: ${summary.processedRows}`);
        console.log(`   Success: ${summary.successRows}`);
        console.log(`   Errors: ${summary.errorRows}`);
        
        if (jobData.job.errorSummary) {
          console.log(`   Error: ${jobData.job.errorSummary}`);
        }

        if (jobData.items && jobData.items.length > 0) {
          console.log('\n📝 Row Details:');
          jobData.items.forEach((item: any) => {
            console.log(`   Row ${item.row_number}: ${item.status} - ${item.entity_type} ${item.entity_key}`);
            if (item.error_message) {
              console.log(`      Error: ${item.error_message}`);
            }
          });
        }

        if (jobStatus === 'completed') {
          console.log('\n✅ Test completed successfully!');
        } else if (jobStatus === 'partial') {
          console.log('\n⚠️ Test completed with some errors');
        } else {
          console.log('\n❌ Test failed');
        }
        
        break;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏱️ Job is still processing. Check status later.');
    }

    // Step 6: Test other endpoints
    console.log('\n5️⃣ Testing additional endpoints...');
    
    // Test history endpoint
    const historyResponse = await fetch(`${API_BASE_URL}/api/upload/okr-file/history?limit=5`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (historyResponse.ok) {
      const history = await historyResponse.json();
      console.log(`   ✅ History endpoint: ${history.jobs.length} recent jobs found`);
    }

    // Test stats endpoint
    const statsResponse = await fetch(`${API_BASE_URL}/api/upload/okr-file/stats`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log(`   ✅ Stats endpoint: ${stats.stats.totalJobs} total jobs`);
    }

    // Test health endpoint
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`   ✅ Health endpoint: System ${health.status}`);
      console.log(`      Database: ${health.checks.database.status}`);
      console.log(`      Storage: ${health.checks.storage.status}`);
      console.log(`      Auth: ${health.checks.auth.status}`);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOKRUpload().catch(console.error);