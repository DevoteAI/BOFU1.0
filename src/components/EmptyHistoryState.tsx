import React from 'react';
import { motion } from 'framer-motion';
import { History, BookOpen, ArrowRight } from 'lucide-react';

interface EmptyHistoryStateProps {
  onStartNew: () => void;
}

export function EmptyHistoryState({ onStartNew }: EmptyHistoryStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-16 px-4"
    >
      <div className="mx-auto max-w-md">
        <motion.div 
          className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.1 }}
        >
          <History className="w-8 h-8 text-primary-600" />
        </motion.div>
        
        <motion.h3 
          className="mb-2 text-2xl font-bold text-gray-900"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Your research history is empty
        </motion.h3>
        
        <motion.p 
          className="mb-8 text-gray-500"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Start your first research project to see your history here. All your analyses will be saved automatically.
        </motion.p>
        
        <motion.button
          onClick={onStartNew}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all mx-auto"
          whileHover={{ scale: 1.03, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)" }}
          whileTap={{ scale: 0.97 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <BookOpen size={18} />
          Start Your First Research
          <ArrowRight size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
} 