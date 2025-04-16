import React from 'react';
import { motion } from 'framer-motion';
import { Plus, History, ClockIcon } from 'lucide-react';

interface PageHeaderProps {
  companyName?: string;
  productCount: number;
  onStartNew: () => void;
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  forceHistoryView?: () => void;
  hideHistoryButton?: boolean;
}

export function PageHeader({ 
  companyName, 
  productCount, 
  onStartNew,
  showHistory,
  setShowHistory,
  forceHistoryView,
  hideHistoryButton = false
}: PageHeaderProps) {

  // Direct handler for the history button
  const handleHistoryClick = () => {
    console.log("History button clicked with forceful navigation");
    
    // Call both functions to ensure navigation happens
    if (setShowHistory) setShowHistory(true);
    if (forceHistoryView) forceHistoryView();
    
    // Also directly update sessionStorage and localStorage
    sessionStorage.setItem('bofu_came_from_history', 'true');
    sessionStorage.setItem('bofu_current_view', 'history');
    
    try {
      const savedState = localStorage.getItem('bofu_app_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        parsedState.showHistory = true;
        parsedState.currentView = 'history';
        parsedState.lastView = 'history';
        localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
      }
    } catch (error) {
      console.error("Error updating localStorage:", error);
    }
    
    // Dispatch a custom event that App.tsx can listen for
    window.dispatchEvent(new CustomEvent('forceHistoryView', { 
      detail: { fromProductResults: true }
    }));
    
    console.log("Directly navigating to history view");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div 
          className="mb-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600">
            {companyName || 'Research Results'}
          </h2>
          <p className="text-sm text-gray-400">
            {productCount} {productCount === 1 ? 'product' : 'products'} analyzed
          </p>
        </motion.div>
        
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {!hideHistoryButton && (showHistory !== undefined || forceHistoryView) && (
            <motion.button
              onClick={handleHistoryClick}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2
                ${showHistory 
                  ? 'bg-gradient-to-r from-secondary-800 to-secondary-700 text-primary-300 border border-primary-500/30 shadow-glow hover:shadow-glow-strong' 
                  : 'text-gray-300 hover:text-primary-300 hover:bg-secondary-800/70'
                }`}
              whileHover={{ y: -1 }}
              whileTap={{ y: 1 }}
            >
              <History className="h-5 w-5" />
              History
            </motion.button>
          )}
          <motion.button
            onClick={onStartNew}
            className="px-4 py-2.5 bg-primary-500 text-secondary-900 rounded-lg hover:bg-primary-400 transition-all 
              shadow-glow hover:shadow-glow-strong flex items-center gap-2 font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} />
            New Research
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
} 