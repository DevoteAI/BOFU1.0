import React from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompetitorAnalysisButtonProps {
  onAnalysisComplete: (documentUrl: string) => void;
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

export function CompetitorAnalysisButton({ product, onAnalysisComplete }: CompetitorAnalysisButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCompetitorAnalysis = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading('Requesting competitor analysis...');

    try {
      const response = await fetch('https://hook.eu2.make.com/7mi4ol7xfurkhubpvtjrx42gpxt28vmj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });

      if (!response.ok) {
        throw new Error('Failed to request competitor analysis');
      }
      
      // Check if response is JSON or plain text
      const contentType = response.headers.get('content-type');
      let documentUrl;
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        documentUrl = data.documentUrl;
      } else {
        // Handle plain text response
        documentUrl = await response.text();
      }
      
      if (documentUrl) {
        onAnalysisComplete(documentUrl);
      } else {
        throw new Error('No document URL received');
      }
      
      toast.success('Competitor analysis request sent successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error requesting competitor analysis:', error);
      toast.error('Failed to request competitor analysis. Please try again.', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleCompetitorAnalysis}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-sm
        bg-gradient-to-r from-secondary-600 to-secondary-500 text-white hover:shadow-md hover:shadow-secondary-100/50
        disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
      whileHover={!isLoading ? { scale: 1.02 } : {}}
      whileTap={!isLoading ? { scale: 0.98 } : {}}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Target className="w-4 h-4" />
          Generate Analysis
        </>
      )}
    </motion.button>
  );
}