#!/usr/bin/env node

// Run this with: node test-airops-api.js
// If fetch is not available, first run: npm install node-fetch

// Try to import node-fetch if in Node.js environment
let fetch;
try {
  fetch = (await import('node-fetch')).default;
  console.log("Using node-fetch for API calls");
} catch (e) {
  console.log("Using global fetch (assuming it's available)");
  fetch = globalThis.fetch;
}

const AIROPS_API_KEY = 'RupciXDLDcCZN3lemLVvxS3TYqtL-KJ5YVr_qubvTX0t9fiPlonZ54yxNYns';
const WORKFLOW_UUID = 'a02357db-32c6-40f5-845a-615cee68bc56';

// Simple test data
const testData = {
  productDetails: {
    name: "Test Product",
    description: "This is a test product to verify AirOps API connection"
  },
  usps: ["Feature 1", "Feature 2"],
  painPoints: ["Pain 1", "Pain 2"],
  features: ["Feature A", "Feature B"],
  capabilities: ["Can do X", "Can do Y"],
  competitors: {
    direct_competitors: ["Competitor A", "Competitor B"],
    niche_competitors: ["Niche Competitor 1"],
    broader_competitors: ["Broader Competitor X"]
  },
  targetPersona: {
    age: "25-34",
    profession: "Developer",
    painPoints: ["Testing is hard"]
  }
};

async function testAirOpsApi() {
  console.log('Testing AirOps API connection...');
  console.log('Using API Key:', AIROPS_API_KEY.substring(0, 5) + '...' + AIROPS_API_KEY.substring(AIROPS_API_KEY.length - 5));
  console.log('Using Workflow UUID:', WORKFLOW_UUID);
  
  const apiUrl = `https://api.airops.com/public_api/airops_apps/${WORKFLOW_UUID}/execute`;
  console.log('API URL:', apiUrl);
  
  const requestBody = {
    inputs: {
      product_card_information: testData
    }
  };
  
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AIROPS_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    console.log('Response Headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`AirOps API Error: ${response.status} ${response.statusText}`);
      console.error('Error details:', responseText);
      return;
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('AirOps API test successful!');
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Raw response:', responseText);
    }
  } catch (error) {
    console.error('Error testing AirOps API:', error);
  }
}

// Run the test
testAirOpsApi(); 