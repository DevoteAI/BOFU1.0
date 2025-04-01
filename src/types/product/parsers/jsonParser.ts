import { ProductAnalysis, defaultProduct } from '../types';
import { extractNumberedProperties, getStringOrJoinArray } from '../utils';

export function parseJsonFormat(data: any): ProductAnalysis | null {
  if (!data) return null;
  
  try {
    const product = { ...defaultProduct };
    
    // Parse company name
    // Clean up company name by removing Inc., Corp., etc. and extra whitespace
    const rawCompanyName = data.company?.name || data.companyName || '';
    product.companyName = rawCompanyName
      .replace(/,?\s*(Inc\.|Corporation|Corp\.|LLC|Ltd\.)$/i, '')
      .trim() || 'Unknown Company';
    
    // Parse product details
    if (data.product) {
      product.productDetails = {
        name: (data.product.name || '').trim(),
        description: (data.product.description || '').trim()
      };
    } else if (data.productDetails) {
      product.productDetails = {
        name: (data.productDetails.name || '').trim(),
        description: (data.productDetails.description || '').trim()
      };
    } else if (data.name && typeof data.name === 'string') {
      product.productDetails = {
        name: data.name.trim(),
        description: (data.description || '').trim()
      };
    }
    
    // Ensure product name is set before generating identifier
    if (!product.productDetails.name) {
      product.productDetails.name = product.companyName 
        ? `${product.companyName} Product`
        : 'Unnamed Product';
    }
    
    // Clean up product name - remove any [NOTE: ...] or [Based on ...] annotations
    product.productDetails.name = product.productDetails.name
      .replace(/\s*\[.*?\]\s*/g, '')
      .trim();
    
    // Clean up product description - remove any [NOTE: ...] or [Based on ...] annotations
    product.productDetails.description = product.productDetails.description
      .replace(/\s*\[.*?\]\s*/g, '')
      .trim();
    
    // Parse USPs - with safety checks
    if (data.unique_selling_proposition) {
      const usp = data.unique_selling_proposition;
      if (Array.isArray(usp)) {
        product.usps = usp
          .slice(0, 20)
          .filter(item => typeof item === 'string' && item.trim())
          .map(item => item.trim());
      } else if (typeof usp === 'object') {
        // Extract from numbered properties (point_1, point_2, etc.)
        const points = extractNumberedProperties(usp, 'point_')
          .filter(point => 
            point !== '[Not Available in Provided Text]' && 
            point !== '[Not Available]' &&
            !point.includes('[Not Available') &&
            point.trim().length > 0
          )
          .map(point => point.trim());
        product.usps = points.length > 0 ? points : [];
      }
    }
    
    // Generate a unique identifier for the product to help detect duplicates
    const productIdentifier = JSON.stringify({
      name: product.productDetails.name,
      company: product.companyName,
      // Add first USP and feature as part of identifier to ensure uniqueness
      firstUsp: data.unique_selling_proposition?.point_1 || 
                (Array.isArray(data.unique_selling_proposition) ? 
                  data.unique_selling_proposition[0] : ''),
      firstFeature: Array.isArray(data.features) ? 
                    data.features[0] : 
                    data.features?.feature_1 || ''
    });
    
    // Add the identifier as a non-enumerable property
    Object.defineProperty(product, '_identifier', {
      value: productIdentifier,
      enumerable: false,
      writable: false
    });
    
    // Parse business overview
    if (data.business_overview && typeof data.business_overview === 'object') {
      const overview = data.business_overview;
      product.businessOverview = {
        mission: typeof overview.mission === 'string' ? overview.mission : '',
        industry: typeof overview.industry === 'string' ? overview.industry : '',
        keyOperations: typeof overview.key_operations === 'string' ? overview.key_operations : ''
      };
    }
    
    // Parse pain points with safety checks
    if (Array.isArray(data.pain_points_solved)) {
      product.painPoints = data.pain_points_solved
        .slice(0, 20) // Limit array size for safety
        .filter(item => typeof item === 'string' && item.trim());
    }
    
    // Parse features with safety checks
    if (data.features) {
      if (Array.isArray(data.features)) {
        product.features = data.features
          .slice(0, 30) // Limit array size for safety
          .filter(item => typeof item === 'string' && item.trim());
      } else if (typeof data.features === 'object') {
        product.features = extractNumberedProperties(data.features, 'feature_');
      } else if (typeof data.features === 'string') {
        product.features = [data.features];
      }
    }
    
    // Parse target persona with safety checks
    if (data.target_persona && typeof data.target_persona === 'object') {
      const persona = data.target_persona;
      product.targetPersona = {
        primaryAudience: Array.isArray(persona.primary_audience)
          ? persona.primary_audience.slice(0, 10).join(', ') // Limit array size
          : getStringOrJoinArray(persona.primary_audience),
        demographics: typeof persona.demographics === 'string' ? persona.demographics : '',
        industrySegments: Array.isArray(persona.industry_segments)
          ? persona.industry_segments.slice(0, 10).join(', ') // Limit array size
          : getStringOrJoinArray(persona.industry_segments),
        psychographics: Array.isArray(persona.psychographics)
          ? persona.psychographics.slice(0, 10).join(', ') // Limit array size
          : getStringOrJoinArray(persona.psychographics)
      };
    }
    
    // Parse pricing
    product.pricing = typeof data.pricing === 'string' ? data.pricing : '';
    
    // Parse current solutions with safety checks
    if (data.current_solutions && typeof data.current_solutions === 'object') {
      const solutions = data.current_solutions;
      product.currentSolutions = {
        directCompetitors: typeof solutions.direct_competitors === 'string'
          ? [solutions.direct_competitors]
          : Array.isArray(solutions.direct_competitors)
            ? solutions.direct_competitors.slice(0, 15) // Limit array size
              .filter(item => typeof item === 'string' && item.trim())
            : [],
        existingMethods: Array.isArray(solutions.existing_methods)
          ? solutions.existing_methods.slice(0, 15) // Limit array size
            .filter(item => typeof item === 'string' && item.trim())
          : []
      };
    }
    
    // Parse capabilities with safety checks
    if (data.capabilities) {
      if (Array.isArray(data.capabilities)) {
        // Remove duplicates and empty values
        const uniqueCapabilities = [...new Set(data.capabilities)]
          .filter(item => typeof item === 'string' && item.trim())
          .map(item => item.trim());

        product.capabilities = data.capabilities
          .slice(0, 20) // Limit array size for safety
          .filter((item, index, self) => 
            typeof item === 'string' && 
            item.trim() && 
            self.indexOf(item) === index
          )
          .map((item, index) => ({
            title: `Capability #${index + 1}`,
            description: item.split('.')[0]?.trim() || item, // Use first sentence as description
            content: item,
            images: []
          }));
      } else if (typeof data.capabilities === 'object') {
        const capabilities = extractNumberedProperties(data.capabilities, 'capability_');
        product.capabilities = capabilities.map((cap, index) => ({
          title: `Capability #${index + 1}`,
          description: cap.split('.')[0]?.trim() || cap,
          content: cap,
          images: []
        }));
      } else if (typeof data.capabilities === 'string') {
        product.capabilities = [{
          title: 'Capability #1',
          description: data.capabilities.split('.')[0]?.trim() || data.capabilities,
          content: data.capabilities,
          images: []
        }];
      }
    }
    
    // Ensure product name is set
    if (!product.productDetails.name) {
      product.productDetails.name = product.companyName 
        ? `${product.companyName} Product`
        : 'Unnamed Product';
    }
    
    return product;
  } catch (error) {
    console.error('Error parsing JSON format:', error);
    return null;
  }
}