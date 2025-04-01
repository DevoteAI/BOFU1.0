import React from 'react';
import { motion } from 'framer-motion';
import { Brain, LogIn, History, Home, Book } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthModal } from './auth/AuthModal';
import { UserMenu } from './auth/UserMenu';

interface MainHeaderProps {
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  onStartNew?: () => void;
  user?: any;
  forceHistoryView?: () => void;
}

export function MainHeader({ 
  showHistory, 
  setShowHistory, 
  onStartNew, 
  user: propUser,
  forceHistoryView 
}: MainHeaderProps) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [user, setUser] = React.useState(propUser);

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="w-full bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onStartNew}
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Go to home"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-md">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <motion.div 
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500"
                initial={{ opacity: 0.5, scale: 1 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.button>
            <motion.h1 
              onClick={onStartNew}
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 animate-text cursor-pointer hidden sm:block"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              BOFU AI
            </motion.h1>
          </div>
          
          <div>
            {user ? (
              <div className="flex items-center gap-3">
                {!showHistory && (
                <motion.button
                  onClick={() => {
                    console.log("MainHeader History button clicked");
                    if (forceHistoryView) {
                      forceHistoryView();
                    } else if (setShowHistory) {
                      setShowHistory(true);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 
                    transition-all shadow-sm hover:shadow-md hover:shadow-primary-100/50"
                  whileHover={{ 
                    scale: 1.02, 
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    backgroundColor: "var(--tw-color-primary-50)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  aria-label="View research history"
                >
                  <History size={18} className="text-secondary-600" />
                  <span className="font-medium">History</span>
                </motion.button>
                )}
                {showHistory && (
                  <motion.button
                    onClick={() => setShowHistory?.(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 
                      transition-all shadow-sm hover:shadow-md hover:shadow-primary-100/50"
                    whileHover={{ 
                      scale: 1.02, 
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "var(--tw-color-primary-50)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Return to home"
                  >
                    <Home size={18} className="text-secondary-600" />
                    <span className="font-medium">Home</span>
                  </motion.button>
                )}
                <UserMenu user={user} />
              </div>
            ) : (
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                aria-label="Sign in"
              >
                <LogIn size={18} />
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </header>
  );
}