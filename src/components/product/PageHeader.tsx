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
    
    console.log("History button clicked in PageHeader - FORCE RELOAD APPROACH");
    
    // First, save any necessary state to sessionStorage
    sessionStorage.setItem('bofu_viewing_history', 'true');
    sessionStorage.setItem('bofu_current_view', 'history');
    sessionStorage.setItem('bofu_viewing_results', 'false');
    sessionStorage.setItem('bofu_force_history_view', 'true');
    
    // Multi-layered approach with fallbacks
    try {
      // Layer 1: Try to use React state update for immediate feedback
      if (setShowHistory) {
        setShowHistory(true);
      }
      
      // Layer 2: Try to use history API with a popstate event
      try {
        const historyURL = window.location.origin + '/history';
        window.history.pushState({}, '', historyURL);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      } catch (error) {
        console.error("History API failed:", error);
      }
      
      // Layer 3: Force router navigation in a timeout
      setTimeout(() => {
        if (navigate) {
          try {
            navigate('/history', { replace: true });
          } catch (error) {
            console.error("Navigation failed:", error);
          }
        }
      }, 50);
      
      // Layer 4: Call the forceHistoryView function if available
      if (forceHistoryView) {
        setTimeout(() => {
          try {
            forceHistoryView();
          } catch (error) {
            console.error("ForceHistoryView failed:", error);
          }
        }, 100);
      }
      
      // Layer 5 (last resort): If after 300ms we're still not on history, force a reload
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath !== '/history') {
          console.log("EMERGENCY REDIRECT: Still not on history page, forcing hard reload");
          window.location.href = window.location.origin + '/history';
        }
      }, 300);
    } catch (error) {
      console.error("All navigation methods failed. Last resort redirect:", error);
      window.location.href = window.location.origin + '/history';
    }
  };

  // Handler for going to the main page
  const handleMainPageClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation();
    
    console.log("Company name clicked in PageHeader - FORCE RELOAD APPROACH");
    
    // First, save any necessary state to sessionStorage
    sessionStorage.setItem('bofu_viewing_history', 'false');
    sessionStorage.setItem('bofu_current_view', 'main');
    sessionStorage.setItem('bofu_viewing_results', 'false');
    sessionStorage.removeItem('bofu_force_history_view');
    
    // Multi-layered approach with fallbacks
    try {
      // Layer 1: Try to use React state update for immediate feedback
      if (setShowHistory) {
        setShowHistory(false);
      }
      
      // Layer 2: Try to use history API with a popstate event
      try {
        const mainURL = window.location.origin + '/';
        window.history.pushState({}, '', mainURL);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      } catch (error) {
        console.error("History API failed:", error);
      }
      
      // Layer 3: Force router navigation in a timeout
      setTimeout(() => {
        if (navigate) {
          try {
            navigate('/', { replace: true });
          } catch (error) {
            console.error("Navigation failed:", error);
          }
        }
      }, 50);
      
      // Layer 4 (last resort): If after 300ms we're still not on main, force a reload
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath !== '/') {
          console.log("EMERGENCY REDIRECT: Still not on main page, forcing hard reload");
          window.location.href = window.location.origin + '/';
        }
      }, 300);
    } catch (error) {
      console.error("All navigation methods failed. Last resort redirect:", error);
      window.location.href = window.location.origin + '/';
    }
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