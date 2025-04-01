import { ProductAnalysis, defaultProduct } from './types';
import { parseJsonFormat } from './parsers/jsonParser';

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
    capabilities: ["Sample Capability 1", "Sample Capability 2"]
  };
}

// Main parser function - handles any input format
export function parseWebhookResponse(input: any): ProductAnalysis[] {
  try {
    console.log("Parsing webhook response, input type:", typeof input);
    
    // Handle null/undefined input
    if (!input) {
      return [createDefaultProduct("Sample Product")];
    }
    
    // Handle object input - with strict safety
    if (typeof input === 'object') {
      // Create a very simple safe copy to avoid circular references
      let safeCopy;
      try {
        // Use a simplified approach to create a safe copy
        if (Array.isArray(input)) {
          // Only take first 5 items from array to avoid excessive processing
          safeCopy = input.slice(0, 5).map(item => {
            try {
              // Handle each item with a try-catch to avoid array processing issues
              return typeof item === 'object' ? {...item} : item;
            } catch (err) {
              return null;
            }
          }).filter(Boolean);
        } else {
          // For objects, create a simple shallow copy
          safeCopy = {...input};
        }
      } catch (error) {
        console.warn("Failed to create safe copy of input, using default product", error);
        return [createDefaultProduct("Sample Product")];
      }
      
      try {
        // Process with a try/catch to catch any unexpected issues
        let results: ProductAnalysis[] = [];
        
        if (Array.isArray(safeCopy)) {
          // Process each item separately to avoid cascading failures
          for (let i = 0; i < safeCopy.length; i++) {
            try {
              const parsed = parseJsonFormat(safeCopy[i]);              
              if (parsed) {
                // Enhanced duplicate detection
                const isDuplicate = results.some(existing => {
                  // Compare essential properties
                  const existingId = Object.getOwnPropertyDescriptor(existing, '_identifier')?.value || '';
                  const parsedId = Object.getOwnPropertyDescriptor(parsed, '_identifier')?.value || '';
                  
                  // If identifiers match exactly, it's definitely a duplicate
                  if (existingId === parsedId) return true;
                  
                  // Additional checks for near-duplicates
                  const isSameProduct = 
                    existing.productDetails.name.toLowerCase() === parsed.productDetails.name.toLowerCase() &&
                    existing.companyName.toLowerCase() === parsed.companyName.toLowerCase();
                  
                  return isSameProduct;
                });
                
                if (!isDuplicate) {
                  results.push(parsed);
                } else {
                  console.log('Skipping duplicate product:', parsed.productDetails.name);
                }
              }
            } catch (err) {
              console.warn(`Error parsing item ${i}:`, err);
              // Continue to next item instead of failing completely
            }
          }
        } else {
          // Parse a single object
          const parsed = parseJsonFormat(safeCopy);
          if (parsed) results.push(parsed);
        }
        
        return results.length > 0 ? results : [createDefaultProduct("Sample Product")];
      } catch (error) {
        console.error("Error processing safe input copy:", error);
        return [createDefaultProduct("Sample Product")];
      }
    }
    
    // Handle string input with extreme caution
    if (typeof input === 'string') {
      // Limit string size to prevent excessive processing
      const maxLength = 500000; // 500KB limit for better stability
      let processedInput = input.length > maxLength ? input.slice(0, maxLength) : input;

      // Clean and normalize the input
      processedInput = processedInput
        .trim()
        .replace(/\r?\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      console.log("Processing string input, starts with:", processedInput.substring(0, 50) + "...");
      
      try {
        let parsedData;
        
        // First attempt: Try parsing as is
        try {
          parsedData = JSON.parse(processedInput);
        } catch (initialError) {
          console.log("Initial parse failed, attempting recovery...");
          
          // Look for JSON-like structures
          const jsonPattern = /\{[^{}]*\}/g;
          const matches = processedInput.match(jsonPattern);
          
          if (matches && matches.length > 0) {
            console.log(`Found ${matches.length} potential JSON objects`);
            
            // If multiple objects found, wrap them in an array
            if (matches.length > 1) {
              processedInput = `[${matches.join(',')}]`;
            } else {
              processedInput = matches[0];
            }
            
            try {
              parsedData = JSON.parse(processedInput);
            } catch (arrayError) {
              // If array parsing fails, try each object individually
              const validObjects = matches
                .map(obj => {
                  try {
                    const parsed = JSON.parse(obj);
                    // Check for minimum required fields to be a valid product
                    if (typeof parsed === 'object' && 
                        (parsed.name || parsed.product?.name || parsed.productDetails?.name)) {
                      return parsed;
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean)
                .filter((obj, index, self) => 
                  // Remove duplicates based on name and description
                  index === self.findIndex(t => 
                    t.name === obj.name && 
                    t.description === obj.description
                  )
                );
              
              if (validObjects.length > 0) {
                parsedData = validObjects.length === 1 ? validObjects[0] : validObjects;
              } else {
                throw new Error('No valid JSON objects found after recovery attempts');
              }
            }
          } else {
            throw new Error('No valid JSON structures found in response');
          }
        }
        
        // Process the parsed data
        if (Array.isArray(parsedData)) {
          console.log(`Processing array of ${parsedData.length} items`);
          const results = parsedData
            .slice(0, 5) // Limit to first 5 items for stability
            .map(item => {
              try {
                return parseJsonFormat(item);
              } catch (err) {
                console.warn(`Failed to parse array item: ${err instanceof Error ? err.message : 'Unknown error'}`);
                return null;
              }
            })
            .filter(Boolean);
          
          return results.length > 0 ? results : [createDefaultProduct("Sample Product")];
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          console.log("Processing single object");
          const result = parseJsonFormat(parsedData);
          return result ? [result] : [createDefaultProduct("Sample Product")];
        }
        
        console.warn("Parsed data is neither array nor object, using default product");
        return [createDefaultProduct("Sample Product")];
      } catch (error) {
        console.error("Failed to parse input:", error instanceof Error ? error.message : 'Unknown error');
        return [createDefaultProduct("Sample Product")];
      }
    }
    return [createDefaultProduct("Sample Product")];
  } catch (error) {
    console.error('Critical error in parseWebhookResponse:', error);
    return [createDefaultProduct("Sample Product")];
  }
}

export type { ProductAnalysis };