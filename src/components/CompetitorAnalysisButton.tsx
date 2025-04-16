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
    setIsLoading(true);
    const loadingToast = toast.loading('Requesting competitor analysis...');

    try {
      console.log("Sending request to webhook with product:", product);
      
      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/n4kuyrqovr1ndwj9nsodio7th70wbm6i',
        {
          product: {
            companyName: product.companyName,
            productName: product.productDetails.name,
            description: product.productDetails.description,
            usps: product.usps,
            features: product.features,
            capabilities: product.capabilities.map(cap => ({
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

      // Parse the response using our new parser
      const parsedProducts = parseProductData(response);
      
      // If we got any products back, use the first one's data
      if (parsedProducts.length > 0) {
        const firstProduct = parsedProducts[0];
        
        // If the product has competitors data, send it to the parent
        if (firstProduct.competitors && onCompetitorsReceived) {
          onCompetitorsReceived(firstProduct.competitors);
        }
        
        // If the product has a competitor analysis URL, send it to the parent
        if (firstProduct.competitorAnalysisUrl) {
          onAnalysisComplete(firstProduct.competitorAnalysisUrl);
        }
      } else {
        // If no products were parsed, check the raw response for a URL
        if (typeof response === 'string' && response.includes('docs.google.com')) {
          onAnalysisComplete(response.trim());
        } else if (typeof response === 'object') {
          const url = response.analysisUrl || response.documentUrl || response.url;
          if (url && typeof url === 'string' && url.includes('docs.google.com')) {
            onAnalysisComplete(url.trim());
          } else {
            throw new Error('No valid analysis URL found in response');
          }
        } else {
          throw new Error('Invalid response format');
        }
      }

      toast.success('Competitor analysis completed');
    } catch (error) {
      console.error('Error in competitor analysis:', error);
      toast.error(`Failed to analyze competitors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCompetitorAnalysis}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Target className="w-4 h-4" />
      )}
      Analyze Competitors
    </motion.button>
  );
}