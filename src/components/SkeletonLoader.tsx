import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  count?: number;
}

export function HistorySkeletonLoader({ count = 3 }: SkeletonProps) {
  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-4 rounded-lg border border-gray-100 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded-md w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-100 rounded-md w-1/2 mt-2 animate-pulse"></div>
            </div>
            <div className="flex space-x-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
} 