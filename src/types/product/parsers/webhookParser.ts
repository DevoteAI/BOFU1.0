import { ProductAnalysis } from '../types';
import { parseJsonFormat } from './jsonParser';

/**
 * Extracts JSON objects from code blocks in the webhook response
 */
function extractJsonFromCodeBlocks(text: string): any[] {
  const jsonObjects: any[] = [];
  
  // Match content between ```json and ``` markers
  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);
      if (parsed && typeof parsed === 'object') {
        jsonObjects.push(parsed);
      }
    } catch (error) {
      console.warn('Failed to parse JSON from code block:', error);
    }
  }
  
  // If we didn't find any JSON in code blocks, try parsing the entire text
  if (jsonObjects.length === 0 && text.trim()) {
    try {
      // Check if the text itself is a JSON string
      if ((text.trim().startsWith('{') && text.trim().endsWith('}')) || 
          (text.trim().startsWith('[') && text.trim().endsWith(']'))) {
        const parsed = JSON.parse(text.trim());
        if (parsed && typeof parsed === 'object') {
          jsonObjects.push(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to parse entire text as JSON:', error);
    }
  }
  
  return jsonObjects;
}

/**
 * Parses a webhook response containing multiple product information objects
 */
export function parseWebhookResponse(response: any): ProductAnalysis[] {
  try {
    // Handle null/undefined input
    if (!response) {
      console.warn('Received null/undefined webhook response');
      return [];
    }
    
    // If response is already an object with result property
    if (typeof response === 'object' && response.result) {
      // Try to extract JSON from result if it's a string
      if (typeof response.result === 'string') {
        const jsonObjects = extractJsonFromCodeBlocks(response.result);
        
        // Parse each JSON object into a ProductAnalysis
        const products = jsonObjects
          .map(json => parseJsonFormat(json))
          .filter((product): product is ProductAnalysis => product !== null);
        
        // Check if we found any products - if not, try to process response.result directly
        if (products.length === 0 && typeof response.result === 'object') {
          const product = parseJsonFormat(response.result);
          if (product) {
            products.push(product);
          }
        }
        
        // Remove duplicates based on product name and company
        const uniqueProducts = products.filter((product, index, self) => 
          index === self.findIndex(p => 
            p.productDetails.name === product.productDetails.name && 
            p.companyName === product.companyName
          )
        );
        
        return uniqueProducts;
      } else if (typeof response.result === 'object') {
        // Try to parse result directly if it's an object
        const product = parseJsonFormat(response.result);
        if (product) {
          return [product];
        }
      }
    }
    
    // If response itself might contain competitors data, try to parse it as a product
    if (typeof response === 'object' && !response.result && (response.competitors || response.competitorAnalysisUrl)) {
      const product = parseJsonFormat(response);
      if (product) {
        return [product];
      }
    }
    
    // If response is a string, try to parse it
    if (typeof response === 'string') {
      const jsonObjects = extractJsonFromCodeBlocks(response);
      
      const products = jsonObjects
        .map(json => parseJsonFormat(json))
        .filter((product): product is ProductAnalysis => product !== null);
      
      return products;
    }
    
    console.warn('Unhandled webhook response format:', response);
    return [];
  } catch (error) {
    console.error('Error parsing webhook response:', error);
    return [];
  }
} 