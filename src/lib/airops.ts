import { ProductAnalysis } from '../types/product/types';

// AirOps API credentials
const AIROPS_API_KEY = 'RupciXDLDcCZN3lemLVvxS3TYqtL-KJ5YVr_qubvTX0t9fiPlonZ54yxNYns';
const WORKFLOW_UUID = 'a02357db-32c6-40f5-845a-615cee68bc56';

// Define the structure expected by AirOps API
interface AirOpsProductInput {
  product_card_information: ProductAnalysis & { google_doc: string };
}

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
 * Formats a Google Doc URL to the required format
 */
function formatGoogleDocUrl(url: string): string {
  try {
    // Check if it's a Google Docs URL
    if (!url.includes('docs.google.com/document')) {
      throw new Error('Not a Google Docs URL');
    }

    // Extract the document ID
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Could not extract document ID');
    }

    const docId = match[1];
    
    // Format to base URL without any suffix (no /edit, no /pub)
    const formattedUrl = `https://docs.google.com/document/d/${docId}`;
    
    console.log('Formatted Google Doc URL:', formattedUrl);
    return formattedUrl;
  } catch (error) {
    console.error('Error formatting Google Doc URL:', error);
    throw new Error('Invalid Google Doc URL provided');
  }
}

/**
 * Sends product data to AirOps via direct API call
 */
export async function sendToAirOps(productData: AirOpsProductInput) {
  try {
    console.log('Sending data to AirOps...');
    
    // Ensure a valid google_doc URL exists and is formatted correctly
    let formattedProductData = { ...productData };
    
    // Format the URL if it exists
    if (productData.product_card_information.google_doc) {
      try {
        const formattedUrl = formatGoogleDocUrl(productData.product_card_information.google_doc);
        formattedProductData = {
          ...productData,
          product_card_information: {
            ...productData.product_card_information,
            google_doc: formattedUrl
          }
        };
      } catch (error) {
        console.warn('Error formatting Google Doc URL:', error);
      }
    } else if (productData.product_card_information.competitorAnalysisUrl) {
      // If google_doc field is not provided but competitorAnalysisUrl is, use that instead
      try {
        const formattedUrl = formatGoogleDocUrl(productData.product_card_information.competitorAnalysisUrl);
        formattedProductData = {
          ...productData,
          product_card_information: {
            ...productData.product_card_information,
            google_doc: formattedUrl
          }
        };
      } catch (error) {
        console.warn('Error formatting competitor analysis URL:', error);
      }
    } else {
      // If neither exists, add a default Google Doc URL that is publicly accessible
      // Use the URL from the user example
      const defaultUrl = "https://docs.google.com/document/d/1qxocRF9_MXzQXnWxTJgteIZGzYbY6vppKlQ4OfqFZ9s";
      formattedProductData = {
        ...productData,
        product_card_information: {
          ...productData.product_card_information,
          google_doc: defaultUrl
        }
      };
      console.log('Added default Google Doc URL:', defaultUrl);
    }
    
    safeLog('Product data being sent to AirOps', formattedProductData);
    
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
          inputs: formattedProductData
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