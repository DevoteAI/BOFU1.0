import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

interface SubmitSectionProps {
  isDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function SubmitSection({ isDisabled, isSubmitting, onSubmit }: SubmitSectionProps) {
  return (
    <div className="w-full">
      <motion.button
        onClick={onSubmit}
        disabled={isDisabled || isSubmitting}
        className={`
          w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white
          transition-all duration-300 shadow-sm
          ${isDisabled 
            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 active:from-primary-800 active:to-secondary-800 hover:shadow-lg'}
          ${isSubmitting ? 'animate-pulse' : ''}
        `}
        whileHover={!isDisabled && !isSubmitting ? { y: -2 } : {}}
        whileTap={!isDisabled && !isSubmitting ? { y: 0 } : {}}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {isSubmitting ? (
          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 size={20} className="mr-2 animate-spin" />
            <span>Processing Research Data...</span>
          </motion.div>
        ) : (
          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="mr-1">Submit for Research</span>
            <ArrowRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}