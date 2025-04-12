import { ProductAnalysis } from '../types/product/types';

// AirOps API credentials
const AIROPS_API_KEY = 'RupciXDLDcCZN3lemLVvxS3TYqtL-KJ5YVr_qubvTX0t9fiPlonZ54yxNYns';
const WORKFLOW_UUID = 'a02357db-32c6-40f5-845a-615cee68bc56';

/**
 * Safely logs objects by handling circular references
 */
function safeLog(prefix: string, obj: any) {
  try {
    // Use a replacer function to handle circular references
    const seen = new WeakSet();
    const safeObj = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    console.log(`${prefix}:`, safeObj);
  } catch (err) {
    console.log(`${prefix} (error stringifying):`, obj);
  }
}

/**
 * Sends product data to AirOps via direct API call
 */
export async function sendToAirOps(productData: ProductAnalysis) {
  try {
    console.log('Sending data to AirOps...');
    safeLog('Product data', productData);
    
    // Make sure competitors is properly structured if it exists
    const preparedData = {
      ...productData,
      competitors: productData.competitors || {
        direct_competitors: [],
        niche_competitors: [],
        broader_competitors: []
      }
    };
    
    // Direct API call
    const response = await fetch(
      `https://api.airops.com/public_api/airops_apps/${WORKFLOW_UUID}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AIROPS_API_KEY}`,
          'Accept': 'application/json'
        },
        // Important: do not include credentials for cross-origin calls to third-party APIs
        credentials: 'omit',
        body: JSON.stringify({
          inputs: {
            product_card_information: preparedData
          }
        })
      }
    );
    
    // Special handling for response errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AirOps API error:', response.status, response.statusText, errorText);
      
      // Check for the specific free tier limitation error
      if (errorText.includes("free tier") || errorText.includes("Contact AirOps support")) {
        throw new Error('ACCOUNT_LIMITATION: Your AirOps account requires an upgrade. Please contact AirOps support for access to this feature.');
      }
      
      throw new Error(`AirOps API error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('AirOps response:', data);
    return data;
  } catch (error) {
    console.error('Error in AirOps integration:', error);
    throw error;
  }
} 