import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EditableText } from '../ui/EditableText';

interface ProductDescriptionProps {
  description: string;
  onUpdate: (description: string) => void;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

export function ProductDescription({ 
  description, 
  onUpdate, 
  isExpanded, 
  toggleExpanded 
}: ProductDescriptionProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Product Description</h3>
        <button
          onClick={toggleExpanded}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse description" : "Expand description"}
        >
          {isExpanded ? 
            <ChevronUp className="text-gray-500" /> : 
            <ChevronDown className="text-gray-500" />
          }
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <EditableText
              value={description}
              onUpdate={onUpdate}
              multiline
            />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1"
          >
            <p className="text-sm text-gray-500 line-clamp-2">
              {description}
            </p>
            <button
              onClick={toggleExpanded}
              className="mt-1 text-xs text-primary-600 hover:text-primary-700 flex items-center"
            >
              Read more
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 