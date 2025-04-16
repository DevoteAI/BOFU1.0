import React from 'react';
import { motion } from 'framer-motion';
import { Plus, History, ClockIcon, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  // Direct handler for the history button
  const handleHistoryClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation();
    
    console.log("History button clicked in PageHeader - using hybrid approach");
    
    // First, save any necessary state to sessionStorage
    if (showHistory !== undefined) {
      sessionStorage.setItem('bofu_viewing_history', 'true');
      sessionStorage.setItem('bofu_current_view', 'history');
      sessionStorage.setItem('bofu_viewing_results', 'false');
    }
    
    // Update local React state if needed
    if (setShowHistory) {
      setShowHistory(true);
    }
    
    // IMPORTANT: Instead of using React Router directly, use history state API
    // This acts similarly to a link click but will work even in production
    const historyURL = window.location.origin + '/history';
    window.history.pushState({}, '', historyURL);
    
    // Dispatch a popstate event to notify the app the URL has changed
    // This triggers React Router to update
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    
    // Call forceHistoryView after navigation if available
    if (forceHistoryView) {
      setTimeout(() => {
        forceHistoryView();
      }, 50);
    }
  };

  // Handler for going to the main page
  const handleMainPageClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation();
    
    console.log("Company name clicked in PageHeader - using hybrid approach");
    
    // First, save any necessary state to sessionStorage
    if (showHistory !== undefined) {
      sessionStorage.setItem('bofu_viewing_history', 'false');
      sessionStorage.setItem('bofu_current_view', 'main');
      sessionStorage.setItem('bofu_viewing_results', 'false');
    }
    
    // Update local React state if needed
    if (setShowHistory) {
      setShowHistory(false);
    }
    
    // IMPORTANT: Instead of using React Router directly, use history state API
    // This acts similarly to a link click but will work even in production
    const mainURL = window.location.origin + '/';
    window.history.pushState({}, '', mainURL);
    
    // Dispatch a popstate event to notify the app the URL has changed
    // This triggers React Router to update
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
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
          <h2 
            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
            onClick={handleMainPageClick}
          >
            <Home className="h-5 w-5 text-primary-400" />
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