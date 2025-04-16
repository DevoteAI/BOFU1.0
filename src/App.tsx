import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthModal } from './components/auth/AuthModal';
import { supabase } from './lib/supabase';
import { MainHeader } from './components/MainHeader';
import { Header } from './components/Header';
import { ResearchHistory } from './components/ResearchHistory';
import { DocumentUploader, ProcessedDocument } from './components/DocumentUploader';
import { BlogLinkInput } from './components/BlogLinkInput';
import { ProductLineInput } from './components/ProductLineInput';
import { SubmitSection } from './components/SubmitSection';
import ProductResultsPage from './components/ProductResultsPage';
import { ProductAnalysis, parseProductData } from './types/product/index';
import { ProcessingModal } from './components/ProcessingModal';
import { ResearchResult, getResearchResults, deleteResearchResult, getResearchResultById } from './lib/research';
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { scrapeBlogContent } from './utils/blogScraper';
import { makeWebhookRequest } from './utils/webhookUtils';

// Create a type for the history item in case it's different from what the ResearchResult type expects
interface HistoryItem {
  title: string;
  timestamp: string;
  input: {
    documents: Array<{
      name: string;
      type: string;
    }>;
    blogLinks: string[];
    productLines: string[];
  };
  results: ProductAnalysis[];
}

export default function App() {
  console.log('App rendering started');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const [user, setUser] = React.useState<any>(null);
  const [showAuthModal, setShowAuthModal] = React.useState(true);
  const [showAdminAuthModal, setShowAdminAuthModal] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [researchHistory, setResearchHistory] = React.useState<ResearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  // Define state variables
  const [activeStep, setActiveStep] = useState(1);
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [blogLinks, setBlogLinks] = useState<string[]>([]);
  const [productLines, setProductLines] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ProductAnalysis[]>([]);
  const [currentResearchId, setCurrentResearchId] = useState<string | undefined>(undefined);
  // Add a view state to control which view is displayed - default to 'auth' instead of 'main'
  const [currentView, setCurrentView] = useState<'auth' | 'main' | 'history' | 'results' | 'admin'>('auth');
  // Keep track of when tab visibility changes
  const [wasVisible, setWasVisible] = useState<boolean>(document.visibilityState === 'visible');
  // Add this right after the wasVisible state declaration
  const [isRestoringState, setIsRestoringState] = useState(false);
  
  console.log('App state initialized', { currentView, user: !!user, showAuthModal });

  // Initial state restoration from localStorage
  const initialStateRef = useRef<any>(null);
  useEffect(() => {
    console.log('Initial state restoration effect running');
    try {
      // First check if we have session state for this tab
      const savedViewState = sessionStorage.getItem('bofu_current_view');
      const wasViewingResults = sessionStorage.getItem('bofu_viewing_results') === 'true';
      const wasViewingHistory = sessionStorage.getItem('bofu_viewing_history') === 'true';
      const wasViewingAdmin = sessionStorage.getItem('bofu_viewing_admin') === 'true';
      const wasViewingMain = sessionStorage.getItem('bofu_viewing_main') === 'true';
      const savedResearchId = sessionStorage.getItem('bofu_research_id');
      const savedActiveStep = sessionStorage.getItem('bofu_active_step');
      const cameFromHistory = sessionStorage.getItem('bofu_came_from_history') === 'true';
      
      console.log('Initial session state:', { 
        savedViewState, 
        wasViewingResults, 
        wasViewingHistory,
        wasViewingAdmin,
        wasViewingMain,
        savedResearchId,
        savedActiveStep,
        cameFromHistory
      });
      
      // Create comprehensive state in initialStateRef
      initialStateRef.current = {
        currentView: savedViewState || 'main',
        prioritizeResults: wasViewingResults,
        prioritizeHistory: wasViewingHistory,
        prioritizeAdmin: wasViewingAdmin,
        prioritizeMain: wasViewingMain,
        researchId: savedResearchId,
        activeStep: savedActiveStep ? parseInt(savedActiveStep, 10) : 1,
        fromHistory: cameFromHistory
      };
      
      // If no session state, fall back to localStorage
      if (!savedViewState) {
        const savedState = localStorage.getItem('bofu_app_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          console.log('Found saved state in localStorage:', parsedState);
          // Merge with initialStateRef
          initialStateRef.current = {
            ...initialStateRef.current,
            ...parsedState
          };
        }
      }
      
      console.log('Initial state reference set:', initialStateRef.current);
    } catch (error) {
      console.error('Error reading initial state from storage:', error);
    }
  }, []);
  
  // Function to force update to history view
  const forceHistoryView = () => {
    console.log("🔄 Forcing history view with DIRECT replacement");
    
    // Force the most direct navigation possible
    window.location.replace(window.location.origin + '/history');
  };

  // Function to handle showing the auth modal
  const handleShowAuthModal = () => {
    console.log("Showing auth modal");
    setShowAuthModal(true);
  };

  // Function to handle showing the admin auth modal
  const handleShowAdminAuthModal = () => {
    setShowAuthModal(false);
    setShowAdminAuthModal(true);
  };

  // Function to handle admin authentication
  const handleAdminAuthenticated = () => {
    setIsAdmin(true);
    setCurrentView('admin');
    // Make sure to close all auth modals
    setShowAuthModal(false);
    setShowAdminAuthModal(false);
  };

  // Auth effect
  useEffect(() => {
    console.log('Auth effect running');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth session retrieved', { hasSession: !!session });
      if (session?.user) {
        setUser(session.user);
        
        // Check if the user is an admin
        const userData = session.user.user_metadata;
        if (userData && (userData.is_admin === true || userData.role === 'admin')) {
          setIsAdmin(true);
          setCurrentView('admin');
        } else {
          setShowAuthModal(false); // Don't show auth modal if user is logged in
          
          // If we have saved state, restore it instead of defaulting to main
          if (initialStateRef.current) {
            const savedState = initialStateRef.current;
            console.log('Restoring saved state after auth:', savedState);
            
            // Check if we have a prioritized results view from session storage
            if (savedState.prioritizeResults) {
              console.log('Prioritizing results view from session storage');
              
              // Set the current view to results first
              setCurrentView('results');
              
              // Restore history context if needed
              if (savedState.fromHistory || sessionStorage.getItem('bofu_came_from_history') === 'true') {
                setShowHistory(true);
              }
              
              // If we have a research ID, load the data in the next effect (this will trigger once view is set)
              if (savedState.researchId) {
                setCurrentResearchId(savedState.researchId);
                
                // Proactively load results data
                setTimeout(async () => {
                  try {
                    const fullResult = await getResearchResultById(savedState.researchId);
                    if (fullResult) {
                      setAnalysisResults(fullResult.data || []);
                      console.log('✅ Successfully loaded results data during auth restoration');
                    }
                  } catch (error) {
                    console.error('Error loading research data during auth restoration:', error);
                  }
                }, 100);
              }
            }
            // Special handling for admin view
            else if (savedState.prioritizeAdmin && isAdmin) {
              console.log('Prioritizing admin view from session storage');
              setCurrentView('admin');
            }
            // Special handling for history view
            else if (savedState.prioritizeHistory || savedState.lastView === 'history' || savedState.currentView === 'history') {
              console.log('Restoring to history view from initial state');
              setCurrentView('history');
              setShowHistory(true);
              
              // Load history data
              loadHistory();
            }
            // Special handling for main view with step restoration
            else if (savedState.prioritizeMain || savedState.currentView === 'main') {
              console.log('Restoring main view with active step:', savedState.activeStep);
              setCurrentView('main');
              if (savedState.activeStep) {
                setActiveStep(savedState.activeStep);
              }
            }
            // Restore view state if it's not 'auth'
            else if (savedState.currentView && savedState.currentView !== 'auth') {
              setCurrentView(savedState.currentView);
              
              // Restore results view with data if needed
              if (savedState.currentView === 'results' && savedState.currentResearchId) {
                // Load the research data in a separate effect to avoid blocking auth flow
                setCurrentResearchId(savedState.currentResearchId);
              }
            } else {
              setCurrentView('main');
            }
            
            // Restore other state as needed
            if (savedState.currentResearchId && !savedState.researchId) {
              setCurrentResearchId(savedState.currentResearchId);
            }
            
            if (savedState.showHistory !== undefined) {
              setShowHistory(savedState.showHistory);
            }
          } else {
            setCurrentView('main'); // Set to main view for authenticated non-admin users
          }
        }
      } else {
        setUser(null);
        setShowAuthModal(true);
        setCurrentView('auth'); // Ensure auth view is set for unauthenticated users
      }
    }).catch(error => {
      console.error('Error getting auth session:', error);
      setShowAuthModal(true);
      setCurrentView('auth');
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed', { event: _event, hasSession: !!session });
      
      if (session?.user) {
        setUser(session.user);
        
        // Check if the user is an admin
        const userData = session.user.user_metadata;
        if (userData && (userData.is_admin === true || userData.role === 'admin')) {
          setIsAdmin(true);
          setCurrentView('admin');
          // Close all auth modals for admin users
          setShowAuthModal(false);
          setShowAdminAuthModal(false);
        } else {
          setShowAuthModal(false);
          setCurrentView('main');
        }
      } else {
        // User logged out or session expired
        setUser(null);
        setIsAdmin(false);
        setShowAuthModal(true);
        // Reset view to auth when logged out - ensure this runs before any redirects
        setCurrentView('auth');
        // Reset other state as needed
        setShowHistory(false);
        setResearchHistory([]);
        
        // If we're handling a logout event (not just a session expiration), 
        // make sure the UI state is updated before any redirects happen
        if (_event === 'SIGNED_OUT') {
          console.log('User signed out - resetting app state');
          // Clear saved app state
          localStorage.removeItem('bofu_app_state');
          // Also clear session storage to prevent issues on next login
          sessionStorage.removeItem('bofu_current_view');
          sessionStorage.removeItem('bofu_viewing_results');
          sessionStorage.removeItem('bofu_research_id');
        }
      }
    });

    return () => {
      console.log('Auth effect cleanup');
      subscription.unsubscribe();
    };
  }, []);

  // Replace the existing handleVisibilityChange function
  const handleVisibilityChange = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    console.log('Visibility changed:', { isVisible, wasVisible });

    if (isVisible && !wasVisible) {
      setIsRestoringState(true);
      try {
        // Restore view state
        const savedViewState = sessionStorage.getItem('bofu_current_view');
        const savedResearchId = sessionStorage.getItem('bofu_research_id');
        const savedProducts = sessionStorage.getItem('bofu_edited_products');
        const wasViewingResults = sessionStorage.getItem('bofu_viewing_results') === 'true';
        
        console.log('Restoring state on visibility change:', {
          savedViewState,
          savedResearchId,
          hasProducts: !!savedProducts,
          wasViewingResults
        });

        // If we were viewing results, restore that state
        if (wasViewingResults && savedProducts) {
          try {
            const parsedProducts = JSON.parse(savedProducts);
            if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
              // Important: Set the same state as what's shown in results view
              setAnalysisResults(parsedProducts);
              setCurrentView('results');
              if (savedResearchId) {
                setCurrentResearchId(savedResearchId);
              }
              // Make sure the view doesn't accidentally revert
              // This is critical for preventing the home page redirect
              window.setTimeout(() => {
                // Double-check view state after React renders
                document.title = "Product Results - BOFU AI";
                console.log('Reinforced results view after tab switch');
              }, 100);
            }
          } catch (error) {
            console.error('Error parsing saved products:', error);
          }
        }
        
        // Restore the appropriate view
        if (savedViewState) {
          setCurrentView(savedViewState as 'auth' | 'main' | 'history' | 'results' | 'admin');
          
          // Make sure we're not accidentally in auth view when user is logged in
          if (savedViewState === 'auth' && user) {
            console.log('Avoiding invalid auth view for logged in user');
            setCurrentView('main');
          }
          
          // Ensure we're restoring the history context properly
          if (savedViewState === 'results' && sessionStorage.getItem('bofu_came_from_history') === 'true') {
            setShowHistory(true);
          }
        }
      } catch (error) {
        console.error('Error restoring state:', error);
      } finally {
        setIsRestoringState(false);
      }
    }
    
    // Always track the current visibility state
    setWasVisible(isVisible);
    
    // When becoming visible, force a window.focus() event to help ensure React handles the state properly
    if (isVisible) {
      window.focus();
    }
  }, [wasVisible, user]);

  // Add this effect to save state when view changes or products change
  useEffect(() => {
    if (!isRestoringState) {
      console.log('Saving current view state:', currentView);
      sessionStorage.setItem('bofu_current_view', currentView);
      sessionStorage.setItem('bofu_viewing_results', (currentView === 'results').toString());
      
      if (currentView === 'results' && analysisResults.length > 0) {
        // Critical: Save the actual product data to session storage
        sessionStorage.setItem('bofu_edited_products', JSON.stringify(analysisResults));
        console.log('Saved products to session storage during view change:', analysisResults.length);
      }
      
      if (currentResearchId) {
        sessionStorage.setItem('bofu_research_id', currentResearchId);
      }
      
      // Save history context
      if (showHistory) {
        sessionStorage.setItem('bofu_came_from_history', 'true');
      } else {
        sessionStorage.removeItem('bofu_came_from_history');
      }
      
      // For admin and history views
      if (currentView === 'admin') {
        sessionStorage.setItem('bofu_viewing_admin', 'true');
      } else {
        sessionStorage.removeItem('bofu_viewing_admin');
      }
      
      if (currentView === 'history') {
        sessionStorage.setItem('bofu_viewing_history', 'true');
      } else {
        sessionStorage.removeItem('bofu_viewing_history');
      }
      
      console.log('Saved state on view/content change:', {
        currentView,
        hasResults: analysisResults.length > 0,
        currentResearchId,
        showHistory
      });
    }
  }, [currentView, analysisResults, currentResearchId, isRestoringState, showHistory]);

  // Save products to session storage independently whenever they change
  useEffect(() => {
    if (analysisResults.length > 0 && !isRestoringState) {
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(analysisResults));
      console.log('Saved products to session storage on data change:', analysisResults.length);
      
      // Also update the current view if we haven't set it yet
      if (currentView !== 'results') {
        console.log('Setting view to results because we have products');
        setCurrentView('results');
        sessionStorage.setItem('bofu_current_view', 'results');
        sessionStorage.setItem('bofu_viewing_results', 'true');
      }
    }
  }, [analysisResults, currentView, isRestoringState]);

  // Add visibility change listener with proper dependency handling
  useEffect(() => {
    console.log('Setting up visibility change listener');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Load research history when component mounts
  useEffect(() => {
    console.log('History effect running', { user: !!user });
    
    if (user) {
      loadHistory();
    } else {
      console.log('Skipping history load - no user');
    }
  }, [user]);

  // Create a loadHistory function that can be called from anywhere in the component
  // Add debounce control to prevent multiple calls in quick succession
  let lastHistoryLoadTime = 0;
  const historyLoadThreshold = 2000; // 2 seconds between loads
  // Track processed save IDs to prevent duplicate handling
  const processedSaveIds = new Set<string>();
  
  const loadHistory = async () => {
    const now = Date.now();
    
    // Skip if called too soon after the last load
    if (now - lastHistoryLoadTime < historyLoadThreshold) {
      console.log('🔄 loadHistory called too soon after previous call, skipping', { 
        timeSinceLastCall: now - lastHistoryLoadTime,
        threshold: historyLoadThreshold
      });
      return;
    }
    
    // Update the timestamp
    lastHistoryLoadTime = now;
    
    console.log('🔄 loadHistory function called');
    
    try {
      console.log('📊 Loading research history from database');
      const results = await getResearchResults();
      
      console.log('✅ Research history loaded successfully', { 
        count: results.length,
        items: results.map(r => ({ id: r.id, title: r.title }))
      });
      
      setResearchHistory(results);
      console.log('⚛️ State updated with new research history');
      
    } catch (error) {
      console.error('❌ Error loading research history:', error);
      toast.error('Failed to load research history');
    } finally {
      setIsLoading(false);
    }
  };

  // State update handlers
  const handleDocumentsProcessed = (docs: ProcessedDocument[]) => {
    setDocuments(docs);
  };

  const handleBlogLinksChange = (links: string[]) => {
    setBlogLinks(links);
  };

  const handleProductLinesChange = (lines: string[]) => {
    setProductLines(lines);
  };

  // Form validation
  const isFormValid = () => {
    return (documents.length > 0 || blogLinks.length > 0) && productLines.length > 0;
  };

  // --- Callback for when ProductResultsPage saves a NEW analysis --- 
  const handleSaveComplete = (newId: string) => {
    console.log(`[App] Received new research ID from ProductResultsPage: ${newId}`);
    
    // Check if we've already processed this ID to prevent duplicate history entries
    if (currentResearchId === newId) {
      console.log(`[App] Research ID ${newId} already set, ignoring duplicate save`);
      return;
    }
    
    // Also check against our processed IDs set
    if (processedSaveIds.has(newId)) {
      console.log(`[App] Already processed ID ${newId}, ignoring duplicate callback`);
      return;
    }
    
    // Add to processed IDs set
    processedSaveIds.add(newId);
    
    // Just store the ID, do nothing else
    setCurrentResearchId(newId);
    
    // NO view changes or history navigation
    
    // Add a cleanup for the processed IDs set to prevent memory leaks
    // Clear IDs older than 5 minutes
    setTimeout(() => {
      processedSaveIds.delete(newId);
    }, 300000); // 5 minutes
  };

  const handleSelectHistoryItem = async (result: ResearchResult) => {
    console.log('Selecting history item:', result.id, 'with data:', result.data);
    
    try {
      // First set the data in state
      setAnalysisResults(result.data);
      setCurrentResearchId(result.id);

      // Update storage immediately
      const stateToSave = {
        currentView: 'results',
        currentResearchId: result.id,
        showHistory: true,
        isViewingResults: true,
        lastView: 'results',
        fromHistory: true,
        isProductCardFromHistory: true
      };

      // Update localStorage and sessionStorage
      localStorage.setItem('bofu_app_state', JSON.stringify(stateToSave));
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(result.data));
      sessionStorage.setItem('bofu_current_view', 'results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
      sessionStorage.setItem('bofu_research_id', result.id);
      sessionStorage.setItem('bofu_came_from_history', 'true');

      // Important: Set view states AFTER data is set
      setCurrentView('results');
      setShowHistory(true);

      // Navigate only if needed, and do it last
      if (location.pathname !== '/results') {
        navigate('/results', { 
          replace: true,
          state: { 
            fromHistory: true,
            researchId: result.id,
            hasData: true,
            products: result.data
          }
        });
      }

      console.log('🔒 Product view state updated:', { 
        researchId: result.id,
        productsCount: result.data.length,
        fromHistory: true,
        view: 'results',
        showHistory: true,
        pathname: location.pathname
      });
      
    } catch (error) {
      console.error('Failed to load selected analysis:', error);
      toast.error('Failed to load selected analysis');
    }
  };
  
  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Validation
      if (documents.length === 0 && blogLinks.length === 0 && productLines.length === 0) {
        toast.error('Please add at least one document, blog link, or product line');
        setIsSubmitting(false);
        return;
      }
      
      const loadingToast = toast.loading('Processing your data...');
      
      console.log('Starting analysis with data:', {
        documents: documents.length,
        blogLinks: blogLinks.length,
        productLines: productLines.length
      });
      
      // Prepare payload
      const payload = {
        documents: documents,
        blogLinks: blogLinks,
        productLines: productLines
      };
      
      // Send request to webhook
      console.log('Sending webhook request with payload:', payload);
      
      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/dmgxx97dencaquxi9vr9khxrr71kotpm',
        payload,
        {
          timeout: 600000, // 10 minutes
          maxRetries: 3,
          retryDelay: 5000,
          pollingInterval: 20000,
          maxPollingAttempts: 30
        }
      );
      
      // Clear loading toast
      toast.dismiss(loadingToast);
      toast.success('Analysis complete!');

      // The response is now the actual result data
      console.log('Processing webhook response:', response);
      
      // Process the response data using the new parser
      const results = parseProductData(response);
      console.log('Parsed webhook response into products:', results);
      
      // Ensure we have valid results
      if (!results || results.length === 0) {
        console.error('No valid results parsed from webhook response');
        toast.error('Failed to parse analysis results');
        setIsSubmitting(false);
        return;
      }
      
      // Set the results - ensure this happens before changing view
      setAnalysisResults(results);
      console.log('Set analysis results state:', results.length);
      
      // Clear previous research ID
      setCurrentResearchId(undefined);
      
      // Force view change to results with explicit state update
      console.log('Changing view to results');
      setCurrentView('results');
      
      // Save this state to localStorage and sessionStorage
      const stateToSave = {
        currentView: 'results',
        showHistory: false,
        isViewingResults: true,
        lastView: 'results',
        prioritizeResults: true
      };
      
      localStorage.setItem('bofu_app_state', JSON.stringify(stateToSave));
      sessionStorage.setItem('bofu_current_view', 'results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(results));

      console.log('Saved app state to storage:', stateToSave);

    } catch (error) {
      console.error('Error submitting analysis:', error);
      toast.error('Failed to submit analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNew = () => {
    // Reset form state
    setDocuments([]);
    setBlogLinks([]);
    setProductLines([]);
    setAnalysisResults([]);
    setActiveStep(1);
    setCurrentResearchId(undefined); // Clear ID when starting new
    setCurrentView('main');
  };

  const handleDeleteResult = async (id: string) => {
    try {
      // First, update the UI to give immediate feedback
      setResearchHistory(prev => prev.filter(item => item.id !== id));
      
      // Then actually delete from the database
      await deleteResearchResult(id);
      toast.success('Research item deleted');
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('An error occurred while deleting');
      // Refresh the history to revert UI changes if there was an error
      loadHistory();
    }
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setCurrentView('main');
  };

  // Render the results page
  const renderResultsPage = () => {
    // Check if we came from history to properly maintain context
    const cameFromHistory = sessionStorage.getItem('bofu_came_from_history') === 'true';
    const shouldShowHistory = cameFromHistory || showHistory;
    
    // When rendering results page, always ensure our session storage is up to date
    // This helps maintain state during tab visibility changes
    sessionStorage.setItem('bofu_current_view', 'results');
    sessionStorage.setItem('bofu_viewing_results', 'true');
    if (currentResearchId) {
      sessionStorage.setItem('bofu_research_id', currentResearchId);
    }
    if (shouldShowHistory) {
      sessionStorage.setItem('bofu_came_from_history', 'true');
    }
    
    // Debug: Log analysis results data
    console.log('Debug - Rendering results page with data:', { 
      analysisResultsLength: analysisResults.length,
      analysisResultsData: analysisResults,
      currentResearchId
    });
    
    return (
      <div className="flex flex-col min-h-screen">
        <MainHeader 
          user={user}
          showHistory={shouldShowHistory} 
          setShowHistory={(value) => {
            console.log("Setting showHistory from results view:", value);
            setShowHistory(value);
            
            // Update session storage to maintain context between tab switches
            if (value) {
              sessionStorage.setItem('bofu_came_from_history', 'true');
              // When turning history on, navigate to history view
              setCurrentView('history');
              // Force a refresh of the history data
              loadHistory().catch(error => {
                console.error('Error refreshing history:', error);
              });
              
              // Explicitly update localStorage
              try {
                const savedState = localStorage.getItem('bofu_app_state');
                if (savedState) {
                  const parsedState = JSON.parse(savedState);
                  parsedState.showHistory = true;
                  parsedState.currentView = 'history';
                  parsedState.lastView = 'history';
                  parsedState.fromHistory = true;
                  localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
                  console.log('Explicitly updated localStorage when entering history from results');
                }
              } catch (error) {
                console.error('Error updating localStorage when entering history from results:', error);
              }
            } else {
              sessionStorage.removeItem('bofu_came_from_history');
            }
          }}
          onStartNew={handleStartNew}
          forceHistoryView={forceHistoryView}
          onShowAuthModal={handleShowAuthModal}
        />
        <ProductResultsPage 
          products={analysisResults} 
          onStartNew={handleStartNew}
          showHistory={shouldShowHistory}
          setShowHistory={(value) => {
            setShowHistory(value);
            
            // Update session storage to maintain context between tab switches
            if (value) {
              sessionStorage.setItem('bofu_came_from_history', 'true');
              // Force navigation to history view when history button is clicked
              setCurrentView('history');
              
              // Explicitly update localStorage
              try {
                const savedState = localStorage.getItem('bofu_app_state');
                if (savedState) {
                  const parsedState = JSON.parse(savedState);
                  parsedState.showHistory = true;
                  parsedState.currentView = 'history';
                  parsedState.lastView = 'history';
                  localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
                  console.log('Updated localStorage when navigating to history from product results');
                }
              } catch (error) {
                console.error('Error updating localStorage when navigating to history:', error);
              }
            } else {
              sessionStorage.removeItem('bofu_came_from_history');
            }
          }}
          forceHistoryView={forceHistoryView}
          existingId={currentResearchId}
          onHistorySave={loadHistory}
          onSaveComplete={handleSaveComplete}
        />
      </div>
    );
  };

  // Render the main view based on the current state
  const renderView = () => {
    // Debug - log current state before rendering
    console.log('Rendering app view:', {
      currentView,
      path: location.pathname,
      hasAnalysisResults: analysisResults.length > 0,
      showHistory,
      isAdmin
    });

    // IMPORTANT: Use the URL path as the primary source of truth, not just the currentView state
    // This ensures we're always showing what the URL indicates, regardless of internal state
    if (location.pathname === '/results') {
      return renderResultsPage();
    }
    
    if (location.pathname === '/history') {
      // Make sure state is synced with URL
      if (currentView !== 'history') {
        setCurrentView('history');
        setShowHistory(true);
      }
      
      return (
        <div className="flex flex-col min-h-screen">
          <MainHeader 
            user={user}
            showHistory={true}
            setShowHistory={(value) => {
              console.log("Setting showHistory from history view:", value);
              setShowHistory(value);
              // When leaving history view, update current view
              if (!value) {
                setCurrentView('main');
                navigate('/', { replace: true });
              }
            }}
            onStartNew={handleStartNew}
            forceHistoryView={forceHistoryView}
            onShowAuthModal={handleShowAuthModal}
          />
          <div className="flex-1 bg-gradient-dark bg-circuit-board">
            <ResearchHistory
              results={researchHistory}
              isLoading={isLoading}
              onSelect={handleSelectHistoryItem}
              onDelete={handleDeleteResult}
              onStartNew={handleStartNew}
            />
          </div>
        </div>
      );
    }

    if (isAdmin && (currentView === 'admin' || location.pathname === '/admin')) {
      return <AdminDashboard onLogout={handleAdminLogout} />;
    }

    // Always show the auth modal if the user isn't authenticated
    if (!user && showAuthModal) {
      return (
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-secondary-900/95 to-secondary-800/95 border-b border-primary-500/30 shadow-lg">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <div className="flex items-center gap-3 group">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="8" fill="#FFE600" />
                        <path d="M18.5 5L7 17.5H14L12.5 27L24 14.5H17L18.5 5Z" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-primary-400 bg-clip-text text-transparent">BOFU ai</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={handleShowAuthModal}
                    className="px-5 py-2 bg-gradient-to-r from-primary-500/80 to-yellow-500/80 text-secondary-900 font-medium rounded-lg 
                      transition-all shadow-md hover:shadow-glow-strong hover:from-primary-500 hover:to-yellow-500"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </nav>
          </header>
          <div className="container max-w-6xl mx-auto px-4 py-16 flex-grow flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-primary-400 bg-clip-text text-transparent">
                BOFU ai Research Assistant
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Upload your research documents, add blog URLs, and specify your product lines to generate comprehensive bottom-of-funnel analysis.
              </p>
              <button
                onClick={handleShowAuthModal}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-yellow-500 text-secondary-900 font-medium rounded-lg 
                  transition-all shadow-md hover:shadow-glow-strong text-lg"
              >
                Sign In to Get Started
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default to main form view for authenticated users (/) or if no other view matches
    // If we've gotten this far and the path is not '/', redirect
    if (location.pathname !== '/' && user) {
      // Schedule a navigation to home
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 0);
    }
    
    // Make sure state is synced
    if (currentView !== 'main' && user) {
                setCurrentView('main');
      setShowHistory(false);
    }

    // Main form view
    return (
      <div className="flex flex-col min-h-screen">
        <MainHeader 
          user={user}
          showHistory={showHistory} 
          setShowHistory={(value) => {
            console.log("Setting showHistory from main view:", value);
            setShowHistory(value);
            // When entering history view, update current view immediately
            if (value) {
              setCurrentView('history');
              navigate('/history', { replace: true });
              // Force a refresh of the history data
              loadHistory().catch(error => {
                console.error('Error refreshing history:', error);
              });
            }
          }}
          onStartNew={handleStartNew}
          forceHistoryView={forceHistoryView}
          onShowAuthModal={handleShowAuthModal}
        />
        <div className="container max-w-6xl mx-auto px-4 py-6 flex-grow">
          <Header />
          
          <div className="space-y-6 mt-6">
            {/* Step 1: Document Upload */}
            <DocumentUploader 
              onDocumentsProcessed={handleDocumentsProcessed} 
            />
            
            {/* Step 2: Blog Link Input */}
            <BlogLinkInput 
              onBlogLinksChange={handleBlogLinksChange}
            />
            
            {/* Step 3: Product Line Input */}
            <ProductLineInput 
              onProductLinesChange={handleProductLinesChange}
            />
            
            {/* Submit Section */}
            <SubmitSection 
              isDisabled={!isFormValid()} 
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting} 
            />
          </div>
        </div>
      </div>
    );
  };
  
  // Add a global navigation handler to detect when the user manually tries to go to the home page
  // This helps catch redirects from logout actions
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // When navigating away, check if we're logging out
      if (document.location.pathname === '/' && user) {
        console.log('Navigation detected - clearing local session data');
        // Force clear any session data to prevent getting stuck
        localStorage.removeItem('supabase.auth.token');
        // Also clear our saved app state
        localStorage.removeItem('bofu_app_state');
      }
      
      // Don't clear sessionStorage on tab/window close to preserve state
      // This ensures that if the user just refreshes the page, their state is preserved
      if (sessionStorage.getItem('bofu_current_view')) {
        // Keep the session storage, but let's log what we're doing
        console.log('Preserving session storage during page unload for view:', sessionStorage.getItem('bofu_current_view'));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, currentView]);
  
  // Add a specific effect for showHistory changes
  useEffect(() => {
    // When showHistory changes, make sure to update localStorage
    if (user) { // Only save state if user is logged in
      const savedState = localStorage.getItem('bofu_app_state');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          parsedState.showHistory = showHistory;
          // If showHistory is true, we're in history view
          if (showHistory) {
            parsedState.currentView = 'history';
            parsedState.lastView = 'history';
          }
          localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
          console.log('Updated localStorage due to showHistory change:', { showHistory, parsedState });
        } catch (error) {
          console.error('Error updating localStorage for showHistory:', error);
        }
      }
    }
  }, [showHistory, user]);
  
  // Add a specific effect for results view changes
  useEffect(() => {
    // When currentView changes to results, update localStorage
    if (currentView === 'results' && user) {
      try {
        const savedState = localStorage.getItem('bofu_app_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          parsedState.currentView = 'results';
          parsedState.isViewingResults = true;
          parsedState.lastView = 'results';
          localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
          console.log('Updated localStorage due to results view change:', parsedState);
        } else {
          // Create new state if none exists
          const newState = {
            currentView: 'results',
            isViewingResults: true,
            lastView: 'results',
            showHistory: false,
            currentResearchId
          };
          localStorage.setItem('bofu_app_state', JSON.stringify(newState));
        }
      } catch (error) {
        console.error('Error updating localStorage for results view:', error);
      }
    }
  }, [currentView, user, currentResearchId]);
  
  // Add an effect to load research data when the current research ID changes
  // This helps ensure results view shows the correct data
  useEffect(() => {
    // Only run this effect if we have a research ID and we're in results view
    if (currentResearchId && currentView === 'results' && user) {
      // If we already have the correct data loaded, don't reload
      if (analysisResults.length === 0) {
        console.log('🔄 Loading research data for ID:', currentResearchId);
        
        // Load the data from the database
        const loadResearchData = async () => {
          try {
            const fullResult = await getResearchResultById(currentResearchId);
            if (fullResult) {
              console.log('✅ Research data loaded successfully');
              setAnalysisResults(fullResult.data || []);
            } else {
              console.error('❌ No data found for research ID:', currentResearchId);
            }
          } catch (error) {
            console.error('❌ Error loading research data:', error);
          }
        };
        
        loadResearchData();
      }
    }
  }, [currentResearchId, currentView, analysisResults.length, user]);
  
  // Add dedicated effect for handling the product card from history view
  useEffect(() => {
    // Only run when we have both conditions: results view and history shown
    if (currentView === 'results' && showHistory && user) {
      console.log('🔄 Product card with history panel state detected - ensuring persistence');
      
      // Always update session storage when this state changes
      sessionStorage.setItem('bofu_current_view', 'results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
      sessionStorage.setItem('bofu_came_from_history', 'true');
      
      if (currentResearchId) {
        sessionStorage.setItem('bofu_research_id', currentResearchId);
      }
      
      // Also update localStorage for persistence across sessions
      try {
        const savedState = localStorage.getItem('bofu_app_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          parsedState.currentView = 'results';
          parsedState.isViewingResults = true;
          parsedState.showHistory = true;
          parsedState.fromHistory = true;
          parsedState.isProductCardFromHistory = true;
          if (currentResearchId) {
            parsedState.currentResearchId = currentResearchId;
          }
          localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
          console.log('Updated localStorage for product card with history panel state');
        }
      } catch (error) {
        console.error('Error updating localStorage for product card with history:', error);
      }
    }
  }, [currentView, showHistory, currentResearchId, user]);
  
  // Listen for custom events from ProductResultsPage
  useEffect(() => {
    const handleProductsUpdated = (event: CustomEvent) => {
      const { products } = event.detail;
      if (Array.isArray(products) && products.length > 0) {
        console.log('App received productsUpdated event with:', products.length);
        setAnalysisResults(products);
      }
    };

    const handleForceResultsView = (event: CustomEvent) => {
      const { products } = event.detail;
      console.log('App received forceResultsView event');
      
      if (Array.isArray(products) && products.length > 0) {
        setAnalysisResults(products);
      }
      
      // Force the view to results
      setCurrentView('results');
      
      // Update session storage
      sessionStorage.setItem('bofu_current_view', 'results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
    };

    // Add event listeners
    window.addEventListener('productsUpdated', handleProductsUpdated as EventListener);
    window.addEventListener('forceResultsView', handleForceResultsView as EventListener);

    return () => {
      // Remove event listeners
      window.removeEventListener('productsUpdated', handleProductsUpdated as EventListener);
      window.removeEventListener('forceResultsView', handleForceResultsView as EventListener);
    };
  }, []);
  
  // Add another event handler for page reloads
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save state on page reload/navigation
      if (currentView === 'results' && analysisResults.length > 0) {
        console.log('Saving state before page unload');
        
        // Save products to sessionStorage
        sessionStorage.setItem('bofu_edited_products', JSON.stringify(analysisResults));
        sessionStorage.setItem('bofu_current_view', 'results');
        sessionStorage.setItem('bofu_viewing_results', 'true');
        
        // If there's a research ID, save it
        if (currentResearchId) {
          sessionStorage.setItem('bofu_research_id', currentResearchId);
        }
        
        // Save history context
        if (showHistory) {
          sessionStorage.setItem('bofu_came_from_history', 'true');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentView, analysisResults, currentResearchId, showHistory]);
  
  // Add event listener for forceHistoryView custom event
  useEffect(() => {
    const handleForceHistoryView = (event: CustomEvent) => {
      console.log('🔄 Received forceHistoryView event with details:', event.detail);
      
      // Force navigation to history view
      setShowHistory(true);
      setCurrentView('history');
      
      // Load history data
      loadHistory().catch(error => {
        console.error('Error loading history data:', error);
      });
      
      // Update local storage
      try {
        const savedState = localStorage.getItem('bofu_app_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          parsedState.showHistory = true;
          parsedState.currentView = 'history';
          parsedState.lastView = 'history';
          localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
          console.log('Updated localStorage when forcing history view');
        }
      } catch (error) {
        console.error('Error updating localStorage when forcing history view:', error);
      }
    };
    
    window.addEventListener('forceHistoryView', handleForceHistoryView as EventListener);
    
    return () => {
      window.removeEventListener('forceHistoryView', handleForceHistoryView as EventListener);
    };
  }, []);
  
  // Add event listener for tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      console.log('Visibility changed:', { isVisible, wasVisible });

      if (isVisible && !wasVisible) {
        setIsRestoringState(true);
        try {
          // Restore view state
          const savedViewState = sessionStorage.getItem('bofu_current_view');
          const savedResearchId = sessionStorage.getItem('bofu_research_id');
          const savedProducts = sessionStorage.getItem('bofu_edited_products');
          const wasViewingResults = sessionStorage.getItem('bofu_viewing_results') === 'true';
          
          console.log('Restoring state on visibility change:', {
            savedViewState,
            savedResearchId,
            hasProducts: !!savedProducts,
            wasViewingResults
          });

          // If we were viewing results, restore that state
          if (wasViewingResults && savedProducts) {
            try {
              const parsedProducts = JSON.parse(savedProducts);
              if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
                // Important: Set the same state as what's shown in results view
                setAnalysisResults(parsedProducts);
                setCurrentView('results');
                if (savedResearchId) {
                  setCurrentResearchId(savedResearchId);
                }
                // Make sure the view doesn't accidentally revert
                // This is critical for preventing the home page redirect
                window.setTimeout(() => {
                  // Double-check view state after React renders
                  document.title = "Product Results - BOFU AI";
                  console.log('Reinforced results view after tab switch');
                }, 100);
              }
            } catch (error) {
              console.error('Error parsing saved products:', error);
            }
          }
          
          // Restore the appropriate view
          if (savedViewState) {
            setCurrentView(savedViewState as 'auth' | 'main' | 'history' | 'results' | 'admin');
            
            // Make sure we're not accidentally in auth view when user is logged in
            if (savedViewState === 'auth' && user) {
              console.log('Avoiding invalid auth view for logged in user');
              setCurrentView('main');
            }
            
            // Ensure we're restoring the history context properly
            if (savedViewState === 'results' && sessionStorage.getItem('bofu_came_from_history') === 'true') {
              setShowHistory(true);
            }
          }
        } catch (error) {
          console.error('Error restoring state:', error);
        } finally {
          setIsRestoringState(false);
        }
      }
      
      // Always track the current visibility state
      setWasVisible(isVisible);
      
      // When becoming visible, force a window.focus() event to help ensure React handles the state properly
      if (isVisible) {
        window.focus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wasVisible, user]);
  
  // Update the URL path change effect to work with React Router
  useEffect(() => {
    console.log("URL path changed, syncing state:", {
      path: location.pathname, 
      currentView,
      state: location.state
    });
    
    // Check for our direct navigation flag
    const fromProductCard = location.state?.fromProductCard;
    
    // If we're coming from product results, make sure state is correctly updated
    const fromResults = location.state?.fromResults;
    
    // Synchronize the currentView state with the URL - but don't override direct navigation
    if (location.pathname === '/history' && !fromProductCard) {
      console.log("URL is /history, setting currentView to history");
      setShowHistory(true);
      setCurrentView('history');
      
      // Force a refresh of the history data
      loadHistory().catch(error => {
        console.error('Error refreshing history data on URL change:', error);
      });
      
      // Clear other view states that might conflict
      sessionStorage.setItem('bofu_viewing_results', 'false');
      sessionStorage.setItem('bofu_viewing_history', 'true');
      
      // Update localStorage
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
        console.error('Error updating localStorage on URL change:', error);
      }
    } else if (location.pathname === '/' && user && !fromProductCard) {
      console.log("URL is /, setting currentView to main");
      // Only change to main if we're logged in
      setShowHistory(false);
      setCurrentView('main');
      
      // Clear other view states that might conflict
      sessionStorage.setItem('bofu_viewing_results', 'false');
      sessionStorage.setItem('bofu_viewing_history', 'false');
      
      // Update localStorage
      try {
        const savedState = localStorage.getItem('bofu_app_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          parsedState.showHistory = false;
          parsedState.currentView = 'main';
          parsedState.lastView = 'main';
          localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
        }
      } catch (error) {
        console.error('Error updating localStorage on URL change:', error);
      }
    }
    // Special case for results page
    else if (location.pathname === '/results' && !fromProductCard) {
      console.log("URL is /results, ensuring results view is active");
      setCurrentView('results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
      
      // Restore history context if it was set
      if (sessionStorage.getItem('bofu_came_from_history') === 'true') {
        setShowHistory(true);
      }
    }
  }, [location.pathname, location.state, loadHistory, user, currentView]);
  
  // Add specific effect for handling view changes to results
  useEffect(() => {
    // Only run this effect when currentView becomes 'results'
    if (currentView === 'results') {
      console.log('Current view changed to results, checking analysisResults:', analysisResults.length);
      
      // If analysisResults is empty, try to recover from sessionStorage
      if (analysisResults.length === 0) {
        const savedProducts = sessionStorage.getItem('bofu_edited_products');
        if (savedProducts) {
          try {
            const parsedProducts = JSON.parse(savedProducts);
            if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
              console.log('Recovered analysis results from session storage:', parsedProducts.length);
              setAnalysisResults(parsedProducts);
            }
          } catch (error) {
            console.error('Failed to parse saved products:', error);
          }
        }
      }
      
      // Force the URL to /results to ensure proper routing
      if (window.location.pathname !== '/results') {
        console.log('Navigating to /results path');
        navigate('/results', { replace: true });
      }
    }
  }, [currentView, analysisResults.length, navigate]);
  
  // Add a dedicated effect for global navigation events
  useEffect(() => {
    const handleGlobalNavigation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const target = customEvent.detail?.target;
      const fromProductResults = customEvent.detail?.fromProductResults;
      
      console.log("🧭 Global navigation event received:", { target, fromProductResults });
      
      // Force direct navigation regardless of current view
      if (target === 'history') {
        console.log("🔄 Navigating to history view from current view:", currentView);
        
        // Update state synchronously
        setShowHistory(true);
        setCurrentView('history');
        
        // Clear any results state if we're navigating away from product results
        if (currentView === 'results') {
          // Don't actually clear analysis results because we want to preserve them
          // for potential back navigation, but do clear the view state
          console.log("Clearing results view state while preserving data");
        }
        
        // Update session storage with clear state
        sessionStorage.setItem('bofu_came_from_history', 'true');
        sessionStorage.setItem('bofu_current_view', 'history');
        sessionStorage.setItem('bofu_viewing_results', 'false');
        sessionStorage.setItem('bofu_viewing_history', 'true');
        
        // Force load history data before navigation to ensure it's available
        loadHistory().then(() => {
          console.log("History data loaded, now navigating");
          
          // Navigate AFTER data is loaded with replace: true to avoid history stack issues
          navigate('/history', { 
            replace: true,
            state: { 
              fromResults: true,
              timestamp: Date.now()  // Add timestamp to force a "new" navigation
            }
          });
          
          // Apply additional view state updates after navigation
          setTimeout(() => {
            setCurrentView('history');
            setShowHistory(true);
            console.log("✅ History view reinforced after navigation");
          }, 50);
        }).catch(error => {
          console.error("Error loading history before navigation:", error);
          // Navigate anyway to prevent UI from being stuck
          navigate('/history', { replace: true });
        });
      } 
      else if (target === 'main') {
        console.log("🔄 Navigating to main view from current view:", currentView);
        
        // Update state synchronously
        setShowHistory(false);
        setCurrentView('main');
        
        // Clear any results state if we're navigating away from product results
        if (currentView === 'results') {
          // Don't actually clear analysis results because we want to preserve them
          // for potential back navigation, but do clear the view state
          console.log("Clearing results view state while preserving data");
        }
        
        // Update session storage
        sessionStorage.removeItem('bofu_came_from_history');
        sessionStorage.setItem('bofu_current_view', 'main');
        sessionStorage.setItem('bofu_viewing_results', 'false');
        sessionStorage.setItem('bofu_viewing_history', 'false');
        sessionStorage.removeItem('bofu_force_history_view');
        
        // Navigate with replace and state to force a fresh navigation
        navigate('/', { 
          replace: true,
          state: { 
            fromResults: true,
            timestamp: Date.now()  // Add timestamp to force a "new" navigation
          }
        });
        
        // Apply additional view state updates after navigation
        setTimeout(() => {
          setCurrentView('main');
          setShowHistory(false);
          console.log("✅ Main view reinforced after navigation");
        }, 50);
      }
    };

    // Listen for the global navigation event
    window.addEventListener('globalNavigation', handleGlobalNavigation);

    return () => {
      window.removeEventListener('globalNavigation', handleGlobalNavigation);
    };
  }, [navigate, loadHistory, currentView]);
  
  // Add specialized function for product card navigation
  const navigateFromProductCardView = (target: 'history' | 'main') => {
    console.log(`🔍 PRODUCT CARD DIRECT NAVIGATION: ${target} (Previous view: ${currentView})`);
    
    // Phase 1: Immediate synchronous state updates
    if (target === 'history') {
      setShowHistory(true);
      
      // Force load history data synchronously (we don't need to wait for it to complete)
      loadHistory().catch(error => {
        console.error("Error loading history during direct navigation:", error);
      });
    } else {
      setShowHistory(false);
    }
    
    // Force view change immediately (don't wait for React batching)
    const viewTarget = target === 'history' ? 'history' : 'main';
    setCurrentView(viewTarget as any);
    
    // Phase 2: Update storage (synchronous operations)
    if (target === 'history') {
      sessionStorage.setItem('bofu_came_from_history', 'true');
      sessionStorage.setItem('bofu_current_view', 'history');
      sessionStorage.setItem('bofu_viewing_results', 'false');
      sessionStorage.setItem('bofu_viewing_history', 'true');
      sessionStorage.removeItem('bofu_viewing_results');
    } else {
      sessionStorage.removeItem('bofu_came_from_history');
      sessionStorage.setItem('bofu_current_view', 'main');
      sessionStorage.setItem('bofu_viewing_results', 'false');
      sessionStorage.setItem('bofu_viewing_history', 'false');
      sessionStorage.removeItem('bofu_force_history_view');
    }
    
    // Phase 3: Forced React re-render using React's own mechanisms
    // Force an update cycle to commit all state changes
    setState({}); // This forces a re-render
    
    // Phase 4: Direct navigate with replacement
    const navPath = target === 'history' ? '/history' : '/';
    console.log(`🚀 Directly navigating to: ${navPath}`);
    navigate(navPath, { 
      replace: true,
      state: { 
        forced: true,
        fromProductCard: true,
        timestamp: Date.now()
      }
    });
    
    // Phase 5: Post-navigation reinforcement
    // Schedule a check to ensure navigation worked, with ability to retry if needed
    setTimeout(() => {
      const currentPath = window.location.pathname;
      const expectedPath = navPath;
      
      console.log(`Navigation check: Current=${currentPath}, Expected=${expectedPath}`);
      
      if (currentPath !== expectedPath) {
        console.warn("Navigation failed to complete properly. Retrying with brute force method");
        window.location.href = window.location.origin + navPath; // Last resort - force hard navigation
      }
    }, 100);
  };

  // Add a simple state updater just to force a re-render when needed
  const [state, setState] = useState({});
  
  // Add a dedicated event listener for direct product card navigation
  useEffect(() => {
    const handleDirectProductCardNavigation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const target = customEvent.detail?.target;
      
      console.log("🧩 Received direct product card navigation request:", target);
      
      if (target === 'history' || target === 'main') {
        // Use our specialized navigation function for product cards
        navigateFromProductCardView(target);
      }
    };
    
    // Add event listener for direct product card navigation
    window.addEventListener('directProductCardNavigation', handleDirectProductCardNavigation as EventListener);
    
    return () => {
      window.removeEventListener('directProductCardNavigation', handleDirectProductCardNavigation as EventListener);
    };
  }, [navigateFromProductCardView]);
  
  return (
    <div className="bg-secondary-900 text-white">
      <Toaster position="top-right" />
      
      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onShowAdminLogin={handleShowAdminAuthModal}
      />
      
      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => {
          setShowAdminAuthModal(false);
          setShowAuthModal(true);
        }}
        onAdminAuthenticated={handleAdminAuthenticated}
      />
      
      {/* Processing Modal */}
      <ProcessingModal isOpen={isSubmitting} />
      
      {/* Main Content */}
      {renderView()}
    </div>
  );
}