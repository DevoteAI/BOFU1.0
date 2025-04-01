import React from 'react';
import { motion } from 'framer-motion';
import { Target, FileText, ExternalLink } from 'lucide-react';
import { ProductAnalysis } from '../../types/product';
import { CompetitorAnalysisButton } from '../CompetitorAnalysisButton';

interface CompetitorAnalysisProps {
  product: ProductAnalysis;
  onUpdate: (url: string) => void;
}

export function CompetitorAnalysis({ product, onUpdate }: CompetitorAnalysisProps) {
  return (
    <motion.div 
      className="bg-gradient-to-r from-secondary-50 to-white rounded-xl border border-secondary-100 p-4 hover:shadow-md transition-all"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="text-secondary-500" size={20} />
          Competitor Analysis
        </h3>
        <CompetitorAnalysisButton 
          product={product} 
          onAnalysisComplete={onUpdate}
        />
      </div>
      
      {product.competitorAnalysisUrl ? (
        <div className="bg-white rounded-lg border border-secondary-100 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center">
              <FileText size={16} className="text-secondary-600" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-gray-900 truncate">
                Competitor Analysis Report
              </p>
              <a
                href={product.competitorAnalysisUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-secondary-600 hover:text-secondary-800 flex items-center w-fit"
              >
                View Report <ExternalLink size={10} className="ml-1" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No competitor analysis report available yet. Click the button above to generate one.
        </p>
      )}
    </motion.div>
  );
} 