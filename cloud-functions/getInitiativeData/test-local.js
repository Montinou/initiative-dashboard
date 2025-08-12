/**
 * Local test for the getInitiativeData function
 * Run with: node test-local.js
 */

require('dotenv').config({ path: '../../.env.local' });

// Mock request and response objects
const mockReq = {
  method: 'POST',
  headers: {
    'content-type': 'application/json'
  },
  body: {
    query: "show me initiatives",
    filters: {
      status: "in_progress"
    }
  }
};

const mockRes = {
  headers: {},
  statusCode: 200,
  body: null,
  
  set(key, value) {
    this.headers[key] = value;
    return this;
  },
  
  status(code) {
    this.statusCode = code;
    return this;
  },
  
  send(body) {
    this.body = body;
    console.log('Response Status:', this.statusCode);
    console.log('Response Headers:', this.headers);
    console.log('Response Body:', body);
    return this;
  },
  
  json(obj) {
    this.body = obj;
    console.log('Response Status:', this.statusCode);
    console.log('Response Headers:', this.headers);
    console.log('Response Body:', JSON.stringify(obj, null, 2));
    return this;
  }
};

// Load and execute the function
console.log('🧪 Testing getInitiativeData function locally...\n');
console.log('Request:', JSON.stringify(mockReq.body, null, 2));
console.log('\n---\n');

// Import and run the function
const { getInitiativeData } = require('./index.js');

// Register the function with mock framework
const functions = {
  http: (name, handler) => {
    if (name === 'getInitiativeData') {
      // Execute the handler
      handler(mockReq, mockRes).then(() => {
        console.log('\n✅ Test completed successfully!');
      }).catch(error => {
        console.error('\n❌ Test failed:', error);
      });
    }
  }
};

// Mock the functions-framework
require.cache[require.resolve('@google-cloud/functions-framework')] = {
  exports: functions
};

// Re-require the index file to trigger registration
delete require.cache[require.resolve('./index.js')];
require('./index.js');