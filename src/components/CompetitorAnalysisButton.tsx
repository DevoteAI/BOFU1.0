import React from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductAnalysis, CompetitorsData } from '../types/product/types';
import { makeWebhookRequest } from '../utils/webhookUtils';
import { parseProductData } from '../types/product';

interface CompetitorAnalysisButtonProps {
  onAnalysisComplete: (documentUrl: string) => void;
  onCompetitorsReceived?: (competitors: CompetitorsData) => void;
  product: {
    companyName: string;
    productDetails: {
      name: string;
      description: string;
    };
    usps: string[];
    features: string[];
    capabilities: Array<{
      title: string;
      description: string;
      content: string;
    }>;
  };
}

export function CompetitorAnalysisButton({ product, onAnalysisComplete, onCompetitorsReceived }: CompetitorAnalysisButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCompetitorAnalysis = async () => {
    if (!product.productDetails?.name || !product.productDetails?.description) {
      toast.error('Product name and description are required');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Requesting competitor analysis...');

    try {
      console.log("Preparing request data for competitor analysis:", {
        companyName: product.companyName,
        productName: product.productDetails.name,
        description: product.productDetails.description
      });
      
      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/n4kuyrqovr1ndwj9nsodio7th70wbm6i',
        {
          product: {
            companyName: product.companyName,
            productName: product.productDetails.name,
            description: product.productDetails.description,
            usps: product.usps || [],
            features: product.features || [],
            capabilities: (product.capabilities || []).map(cap => ({
              title: cap.title,
              description: cap.description,
              content: cap.content
            }))
          },
          requestType: 'competitor_analysis'
        },
        {
          timeout: 300000, // 5 minutes
          maxRetries: 3,
          retryDelay: 2000
        }
      );

      console.log("Received response from webhook:", response);

      // Parse the response using our new parser
      const parsedProducts = parseProductData(response);
      console.log("Parsed products:", parsedProducts);
      
      // If we got any products back, use the first one's data
      if (parsedProducts.length > 0) {
        const firstProduct = parsedProducts[0];
        
        // If the product has competitors data, send it to the parent
        if (firstProduct.competitors && onCompetitorsReceived) {
          console.log("Updating competitors data:", firstProduct.competitors);
          onCompetitorsReceived(firstProduct.competitors);
        }
        
        // If the product has a competitor analysis URL, send it to the parent
        if (firstProduct.competitorAnalysisUrl) {
          console.log("Updating competitor analysis URL:", firstProduct.competitorAnalysisUrl);
          onAnalysisComplete(firstProduct.competitorAnalysisUrl);
        } else {
          // If no URL was found in the parsed product, check the raw response
          checkAndProcessRawResponse(response);
        }
      } else {
        // If no products were parsed, check the raw response for a URL and competitors
        checkAndProcessRawResponse(response);
      }

      toast.success('Competitor analysis completed', { id: loadingToast });
    } catch (error) {
      console.error('Error in competitor analysis:', error);
      toast.error(`Failed to analyze competitors: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract URL and competitors from response
  const checkAndProcessRawResponse = (response: any) => {
    // First check for a URL
    let url = null;
    
    if (typeof response === 'string' && response.includes('docs.google.com')) {
      console.log("Found direct Google Docs URL in response");
      url = response.trim();
    } else if (typeof response === 'object') {
      url = response.analysisUrl || response.documentUrl || response.url || null;
      
      // Check for competitors data in the response
      if (response.competitors && onCompetitorsReceived) {
        console.log("Found competitors data in raw response:", response.competitors);
        onCompetitorsReceived(response.competitors);
      } else if (response.result && typeof response.result === 'object') {
        // Check for competitors in result object
        if (response.result.competitors && onCompetitorsReceived) {
          console.log("Found competitors data in result object:", response.result.competitors);
          onCompetitorsReceived(response.result.competitors);
        }
      } else if (response.result && typeof response.result === 'string') {
        // Try to parse the result string
        try {
          const resultObj = JSON.parse(response.result);
          if (resultObj.competitors && onCompetitorsReceived) {
            console.log("Found competitors data in parsed result string:", resultObj.competitors);
            onCompetitorsReceived(resultObj.competitors);
          }
        } catch (e) {
          console.warn("Could not parse result string as JSON");
        }
      }
    }
    
    // If a URL was found, pass it to the parent
    if (url && typeof url === 'string' && url.includes('docs.google.com')) {
      console.log("Found URL in response object:", url);
      onAnalysisComplete(url.trim());
    } else {
      throw new Error('No valid analysis URL found in response');
    }
  };

  return (
    <button
      onClick={handleCompetitorAnalysis}
      disabled={isLoading}
      className="px-4 py-2 bg-primary-500 text-secondary-900 font-medium rounded-lg hover:bg-primary-400 transition-colors shadow-glow hover:shadow-glow-strong flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 disabled:hover:shadow-none"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Target className="w-4 h-4" />
          Generate Analysis
        </>
      )}
    </button>
  );
}