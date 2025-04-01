import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, CheckCircle } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
}

const pulseAnimation = {
  scale: [1, 1.1, 1],
  opacity: [0.8, 1, 0.8],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export function ProcessingModal({ isOpen }: ProcessingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          
          {/* Modal Container */}
          <motion.div 
            className="relative w-full max-w-lg mx-4 sm:mx-auto z-[60]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <motion.div 
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg"
                    animate={pulseAnimation}
                  >
                    <Brain className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.div 
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 animate-text">
                    Processing Your Research
                  </h3>
                  <p className="text-gray-600">
                    Our AI is analyzing your data
                  </p>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="space-y-6">
                <div className="relative">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 bg-[length:200%_auto]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: 60,
                        ease: "linear",
                        background: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                          from: "0% center",
                          to: "-200% center"
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Status Messages */}
                <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                    <p className="text-sm text-gray-600">
                      This process typically takes 1-2 minutes to complete
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    We're using advanced AI to:
                    <ul className="mt-2 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-500" />
                        Extract key information from your documents
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-secondary-500" />
                        Analyze market trends and patterns
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-success-500" />
                        Generate comprehensive insights
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}