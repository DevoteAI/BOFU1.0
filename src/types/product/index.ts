import { ProductAnalysis, defaultProduct } from './types';
import { parseJsonFormat } from './parsers/jsonParser';
import { parseWebhookResponse } from './parsers/webhookParser';

// Create a default product with sample data
function createDefaultProduct(name: string): ProductAnalysis {
  return {
    ...defaultProduct,
    companyName: "Sample Company",
    productDetails: {
      name: name || "Sample Product",
      description: "This is a sample product description. The webhook response couldn't be properly parsed."
    },
    usps: ["Sample USP 1", "Sample USP 2"],
    features: ["Sample Feature 1", "Sample Feature 2", "Sample Feature 3"],
    painPoints: ["Sample Pain Point 1", "Sample Pain Point 2"],
    targetPersona: {
      primaryAudience: "Sample Primary Audience",
      demographics: "Sample Demographics",
      industrySegments: "Sample Industry Segments",
      psychographics: "Sample Psychographics"
    },
    capabilities: [
      {
        title: "Sample Capability 1",
        description: "Description of sample capability 1",
        content: "Detailed content about sample capability 1",
        images: []
      },
      {
        title: "Sample Capability 2",
        description: "Description of sample capability 2",
        content: "Detailed content about sample capability 2",
        images: []
      }
    ]
  };
}

// Main parser function - handles any input format
export function parseProductData(input: any): ProductAnalysis[] {
  try {
    console.log("Parsing product data, input type:", typeof input);
    
    // Handle null/undefined input
    if (!input) {
      console.warn("Received null/undefined input");
      return [createDefaultProduct("Sample Product")];
    }
    
    // First try parsing as a webhook response
    if (typeof input === 'object' && (input.result || input.status === 'completed')) {
      const products = parseWebhookResponse(input);
      if (products.length > 0) {
        return products;
      }
    }
    
    // If not a webhook response or no products found, try parsing as regular JSON
    if (typeof input === 'object') {
      // Create a safe copy to avoid circular references
      let safeCopy;
      try {
        if (Array.isArray(input)) {
          safeCopy = input.slice(0, 5).map(item => {
            try {
              return typeof item === 'object' ? {...item} : item;
            } catch (err) {
              return null;
            }
          }).filter(Boolean);
        } else {
          safeCopy = {...input};
        }
      } catch (error) {
        console.warn("Failed to create safe copy of input, using default product", error);
        return [createDefaultProduct("Sample Product")];
      }
      
      try {
        let results: ProductAnalysis[] = [];
        
        if (Array.isArray(safeCopy)) {
          for (let i = 0; i < safeCopy.length; i++) {
            try {
              const parsed = parseJsonFormat(safeCopy[i]);
              if (parsed) {
                const isDuplicate = results.some(existing => {
                  const existingId = Object.getOwnPropertyDescriptor(existing, '_identifier')?.value || '';
                  const parsedId = Object.getOwnPropertyDescriptor(parsed, '_identifier')?.value || '';
                  
                  if (existingId === parsedId) return true;
                  
                  return existing.productDetails.name.toLowerCase() === parsed.productDetails.name.toLowerCase() &&
                         existing.companyName.toLowerCase() === parsed.companyName.toLowerCase();
                });
                
                if (!isDuplicate) {
                  results.push(parsed);
                }
              }
            } catch (err) {
              console.warn(`Error parsing item ${i}:`, err);
            }
          }
        } else {
          const parsed = parseJsonFormat(safeCopy);
          if (parsed) results.push(parsed);
        }
        
        return results.length > 0 ? results : [createDefaultProduct("Sample Product")];
      } catch (error) {
        console.error("Error processing safe input copy:", error);
        return [createDefaultProduct("Sample Product")];
      }
    }
    
    // Handle string input
    if (typeof input === 'string') {
      // Try parsing as webhook response first
      const products = parseWebhookResponse(input);
      if (products.length > 0) {
        return products;
      }
      
      // If not a webhook response, try parsing as regular JSON
      const maxLength = 500000;
      let processedInput = input.length > maxLength ? input.slice(0, maxLength) : input;
      processedInput = processedInput.trim().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
      
      try {
        let parsedData = JSON.parse(processedInput);
        
        if (Array.isArray(parsedData)) {
          const results = parsedData
            .slice(0, 5)
            .map(item => parseJsonFormat(item))
            .filter((product): product is ProductAnalysis => product !== null);
          
          return results.length > 0 ? results : [createDefaultProduct("Sample Product")];
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          const result = parseJsonFormat(parsedData);
          return result ? [result] : [createDefaultProduct("Sample Product")];
        }
      } catch (error) {
        console.error("Failed to parse input:", error);
        return [createDefaultProduct("Sample Product")];
      }
    }
    
    return [createDefaultProduct("Sample Product")];
  } catch (error) {
    console.error('Critical error in parseProductData:', error);
    return [createDefaultProduct("Sample Product")];
  }
}

export type { ProductAnalysis };