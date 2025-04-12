import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { AuthModal } from './components/auth/AuthModal';
import { supabase } from './lib/supabase';
import { MainHeader } from './components/MainHeader';
import { Header } from './components/Header';
import { ResearchHistory } from './components/ResearchHistory';
import { DocumentUploader, ProcessedDocument } from './components/DocumentUploader';
import { BlogLinkInput } from './components/BlogLinkInput';
import { ProductLineInput } from './components/ProductLineInput';
import { SubmitSection } from './components/SubmitSection';
import { ProductResultsPage } from './components/ProductResultsPage';
import { ProductAnalysis, parseWebhookResponse } from './types/product/index';
import { ProcessingModal } from './components/ProcessingModal';
import { ResearchResult, getResearchResults, deleteResearchResult, getResearchResultById } from './lib/research';
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminDashboard } from './components/admin/AdminDashboard';

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
    console.log("🔄 Forcing history view - current state:", { 
      showHistory, 
      currentView, 
      activeStep,
      hasResults: analysisResults.length > 0,
      historyCount: researchHistory.length
    });
    
    // First update the state
    setShowHistory(true);
    setCurrentView('history');
    
    // Add a timeout to ensure data is refreshed before view is changed
    setTimeout(() => {
      // Force a refresh of the history data
      loadHistory().then(() => {
        console.log("✅ History data refreshed after force view change");
      });
      
      // Log the state after the update
      console.log("🔄 After forceHistoryView - state is now:", { 
        showHistory: true, 
        currentView: 'history',
        historyCount: researchHistory.length
      });
    }, 200);
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

  // Effect to persist and restore app state when tab focus changes
  useEffect(() => {
    // Function to save the current state to localStorage
    const saveStateToStorage = () => {
      const stateToSave = {
        currentView,
        currentResearchId,
        showHistory,
        // Add more detailed state information
        lastView: currentView === 'history' ? 'history' : currentView, // Track history view explicitly
        // For results view, explicitly track that we're viewing results
        isViewingResults: currentView === 'results',
        // Tracking if we're viewing a product card from history
        isProductCardFromHistory: currentView === 'results' && showHistory,
        fromHistory: showHistory && currentView === 'results',
        // Add other important state variables as needed
      };
      localStorage.setItem('bofu_app_state', JSON.stringify(stateToSave));
      console.log('App state saved to localStorage:', stateToSave);
    };

    // Function to restore state from localStorage
    const restoreStateFromStorage = async () => {
      try {
        const savedState = localStorage.getItem('bofu_app_state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          console.log('Restoring app state from localStorage:', parsedState);
          
          // Only restore state if user is authenticated
          if (user) {
            // Priority #1: If we were viewing results, restore that first
            if (parsedState.isViewingResults || parsedState.currentView === 'results') {
              console.log('Restoring results view');
              
              // If we have a research ID, load that data
              if (parsedState.currentResearchId) {
                // Check if we already have the data loaded
                if (!analysisResults.length || currentResearchId !== parsedState.currentResearchId) {
                  console.log('Loading research data for restored results view:', parsedState.currentResearchId);
                  try {
                    // Fetch the data from the database
                    const fullResult = await getResearchResultById(parsedState.currentResearchId);
                    if (fullResult) {
                      setAnalysisResults(fullResult.data || []);
                      setCurrentResearchId(fullResult.id);
                      // Important: Set the current view AFTER loading data
                      setCurrentView('results');
                      return; // Exit early to prevent history view from overriding
                    } else {
                      console.error('Could not load research data for ID:', parsedState.currentResearchId);
                    }
                  } catch (error) {
                    console.error('Error loading research data:', error);
                  }
                } else {
                  // We already have the data, just restore the view
                  setCurrentView('results');
                  return; // Exit early
                }
              } else if (analysisResults.length > 0) {
                // We have results but no ID (unsaved analysis)
                setCurrentView('results');
                return; // Exit early
              }
            }
            
            // Priority #2: Handle history view if not viewing results
            if (parsedState.lastView === 'history' || parsedState.currentView === 'history') {
              console.log('Restoring history view');
              setCurrentView('history');
              setShowHistory(true);
              
              // Make sure we have history data loaded
              await loadHistory();
              return; // Exit early
            } 
            
            // Priority #3: Handle other views
            if (parsedState.currentView && parsedState.currentView !== 'auth') {
              setCurrentView(parsedState.currentView);
            }
            
            // Restore other state as needed
            if (parsedState.currentResearchId) {
              setCurrentResearchId(parsedState.currentResearchId);
            }
            
            if (parsedState.showHistory !== undefined) {
              setShowHistory(parsedState.showHistory);
            }
          }
        }
      } catch (error) {
        console.error('Error restoring state from localStorage:', error);
      }
    };

    // Create a dedicated function to detect and save the current view state
    const saveViewState = () => {
      try {
        // Store the current view state in session storage (which persists only for the current tab)
        // This ensures we maintain view state even during page reloads or tab visibility changes
        sessionStorage.setItem('bofu_current_view', currentView);
        
        // Store information for all views, not just results
        if (currentView === 'results') {
          sessionStorage.setItem('bofu_viewing_results', 'true');
          if (currentResearchId) {
            sessionStorage.setItem('bofu_research_id', currentResearchId);
          }
          
          // Store additional state about where we came from
          if (showHistory) {
            sessionStorage.setItem('bofu_came_from_history', 'true');
          } else {
            sessionStorage.removeItem('bofu_came_from_history');
          }
        } else if (currentView === 'history') {
          sessionStorage.setItem('bofu_viewing_history', 'true');
        } else if (currentView === 'admin') {
          sessionStorage.setItem('bofu_viewing_admin', 'true');
        } else if (currentView === 'main') {
          sessionStorage.setItem('bofu_viewing_main', 'true');
          sessionStorage.setItem('bofu_active_step', activeStep.toString());
        }
        
        // Clear any flags that don't apply to current view
        if (currentView !== 'results') sessionStorage.removeItem('bofu_viewing_results');
        if (currentView !== 'history') sessionStorage.removeItem('bofu_viewing_history');
        if (currentView !== 'admin') sessionStorage.removeItem('bofu_viewing_admin');
        if (currentView !== 'main') sessionStorage.removeItem('bofu_viewing_main');
        
        console.log('🔒 View state saved to sessionStorage:', { currentView, researchId: currentResearchId, showHistory });
      } catch (error) {
        console.error('Error saving view state to sessionStorage:', error);
      }
    };

    // Save state when view changes
    saveStateToStorage();
    // Also save to session storage
    saveViewState();

    // Setup visibility change listener to restore state when tab regains focus
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      // Only trigger actions when visibility actually changes
      if (isVisible !== wasVisible) {
        if (isVisible) {
          console.log('🔄 Tab regained focus, checking stored session state');
          
          try {
            // First check session storage for the current tab's specific view
            const savedViewState = sessionStorage.getItem('bofu_current_view');
            const wasViewingResults = sessionStorage.getItem('bofu_viewing_results') === 'true';
            const wasViewingHistory = sessionStorage.getItem('bofu_viewing_history') === 'true';
            const wasViewingAdmin = sessionStorage.getItem('bofu_viewing_admin') === 'true';
            const wasViewingMain = sessionStorage.getItem('bofu_viewing_main') === 'true';
            const savedResearchId = sessionStorage.getItem('bofu_research_id');
            const savedActiveStep = sessionStorage.getItem('bofu_active_step');
            const cameFromHistory = sessionStorage.getItem('bofu_came_from_history') === 'true';
            
            console.log('📊 Session storage state:', { 
              savedViewState, 
              wasViewingResults, 
              wasViewingHistory,
              wasViewingAdmin,
              wasViewingMain,
              savedResearchId,
              savedActiveStep,
              cameFromHistory,
              currentView
            });
            
            // Check if we need to restore the product card from history
            // Handle special case where we should be seeing results (from history) but are in history view
            if (wasViewingResults && cameFromHistory && currentView === 'history' && savedResearchId) {
              console.log('🔍 Restoring product card view from history');
              
              // Small delay to ensure component is fully mounted
              setTimeout(async () => {
                try {
                  const fullResult = await getResearchResultById(savedResearchId);
                  if (fullResult) {
                    setAnalysisResults(fullResult.data || []);
                    setCurrentResearchId(savedResearchId);
                    setCurrentView('results');
                    setShowHistory(true);
                    console.log('✅ Successfully restored product card view from history');
                  }
                } catch (error: any) {
                  console.error('❌ Error restoring product card view:', error);
                }
              }, 100);
              
              return; // Skip other checks
            }
            
            // First check if we need to restore the view at all
            if (savedViewState && savedViewState !== currentView) {
              console.log(`🔍 Need to restore ${savedViewState} view from session state (current: ${currentView})`);
              
              // Handle results view restoration
              if (savedViewState === 'results' || wasViewingResults) {
                // If we have a research ID and we're not already showing those results
                if (savedResearchId && (savedResearchId !== currentResearchId || currentView !== 'results')) {
                  // Small delay to ensure component is fully mounted
                  setTimeout(async () => {
                    try {
                      const fullResult = await getResearchResultById(savedResearchId);
                      if (fullResult) {
                        setAnalysisResults(fullResult.data || []);
                        setCurrentResearchId(savedResearchId);
                        setCurrentView('results');
                        
                        // If this result was opened from history, preserve that state
                        if (cameFromHistory) {
                          setShowHistory(true);
                        }
                        
                        console.log('✅ Successfully restored results view with data');
                      }
                    } catch (error: any) {
                      console.error('❌ Error restoring results view:', error);
                    }
                  }, 100);
                } 
                // If we already have results loaded, just make sure we're in results view
                else if (analysisResults.length > 0) {
                  setCurrentView('results');
                  
                  // If this result was opened from history, preserve that state
                  if (cameFromHistory) {
                    setShowHistory(true);
                  }
                }
              } 
              // Handle history view restoration
              else if (savedViewState === 'history' || wasViewingHistory) {
                console.log('🔍 Restoring history view from session state');
                setCurrentView('history');
                setShowHistory(true);
                // Refresh history data
                setTimeout(() => {
                  loadHistory().catch(err => console.error("Error loading history:", err));
                }, 100);
              }
              // Handle admin view restoration
              else if (savedViewState === 'admin' || wasViewingAdmin) {
                console.log('🔍 Restoring admin view from session state');
                if (isAdmin) {
                  setCurrentView('admin');
                }
              }
              // Handle main view restoration 
              else if (savedViewState === 'main' || wasViewingMain) {
                console.log('🔍 Restoring main view from session state');
                setCurrentView('main');
                if (savedActiveStep) {
                  setActiveStep(parseInt(savedActiveStep, 10) || 1);
                }
              }
              
              return; // Skip the localStorage check since we've handled this case
            } else {
              console.log('📊 No session state changes needed, current view matches saved view');
            }
          } catch (error) {
            console.error('Error reading session storage:', error);
          }
          
          // If we don't have session-specific state, fall back to localStorage
          setTimeout(() => {
            restoreStateFromStorage().catch((error: any) => {
              console.error('Error in visibility change handler:', error);
            });
          }, 100);
        } else {
          console.log('💤 Tab lost focus, saving current view state');
          // Save state when tab loses focus
          saveStateToStorage();
          // Also save to session storage for this specific tab
          saveViewState();
        }
        
        // Update the visibility tracking state
        setWasVisible(isVisible);
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentView, currentResearchId, showHistory, user, analysisResults, wasVisible]);

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
  const loadHistory = async () => {
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
    // Just store the ID, do nothing else
    setCurrentResearchId(newId);
    // NO view changes or history navigation
  };

  const handleSelectHistoryItem = async (result: ResearchResult) => {
    console.log('Selecting history item:', result.id);
    
    try {
      // First, ensure the history panel stays visible when viewing the product
      setShowHistory(true);
      
      // Set the current research ID and load results
      setCurrentResearchId(result.id);
      setAnalysisResults(result.data);
      
      // Important: Set the view to results after setting other state
      setCurrentView('results');
      
      // Aggressively save this state to both storage mechanisms
      // to ensure it persists during tab switches
      
      // Save to sessionStorage for tab-specific state
      sessionStorage.setItem('bofu_current_view', 'results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
      sessionStorage.setItem('bofu_research_id', result.id);
      sessionStorage.setItem('bofu_came_from_history', 'true');
      
      // Save to localStorage for longer-term persistence
      const stateToSave = {
        currentView: 'results',
        currentResearchId: result.id,
        showHistory: true, // Keep history context
        isViewingResults: true, // Explicitly mark that we're viewing results
        lastView: 'results', // Set last view to results
        fromHistory: true, // Track that we came from history
        isProductCardFromHistory: true // Explicit flag for this state
      };
      localStorage.setItem('bofu_app_state', JSON.stringify(stateToSave));
      
      console.log('🔒 Product view state aggressively saved to both storage mechanisms:', { 
        researchId: result.id,
        fromHistory: true,
        view: 'results',
        showHistory: true
      });
      
    } catch (error) {
      console.error('Error selecting history item:', error);
      toast.error('Failed to load selected analysis');
    }
  };
  
  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);

    try {
      // Prepare the payload for the webhook - limit content size for large documents
      const payload = {
        documents: documents.map(doc => ({
          name: doc.name,
          // Strictly limit document content to 50KB to prevent processing errors
          content: doc.content.length > 50000 ? doc.content.substring(0, 50000) + "... (content truncated)" : doc.content,
          type: doc.type
        })),
        // Limit the number of inputs to prevent processing errors
        blogLinks: blogLinks.slice(0, 10), 
        productLines: productLines.slice(0, 10)
      };

      // Send data to webhook
      const response = await fetch('https://hook.us2.make.com/dmgxx97dencaquxi9vr9khxrr71kotpm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Get the response as text first to inspect it
      const responseText = await response.text();
      
      // Split the response by the separator line
      const jsonObjects = responseText.split('------------------------');
      console.log(`Found ${jsonObjects.length} JSON objects separated by delimiter`);
      
      // Process each JSON object separately
      const results: ProductAnalysis[] = [];

      for (const jsonStr of jsonObjects) {
          try {
            // Clean up the JSON string
            const cleaned = jsonStr
              .replace(/```json/g, '') // Remove JSON code block markers
              .replace(/```/g, '')     // Remove remaining code block markers
            .trim();                 // Remove extra whitespace
          
          // Only attempt to parse if we have content
          if (cleaned.length === 0) continue;
          
          // Parse and handle any response formatting issues
          const parsedResults = parseWebhookResponse(cleaned);
          if (parsedResults && parsedResults.length > 0) {
            results.push(...parsedResults);
          }
        } catch (err) {
          console.error('Failed to parse result item:', err, jsonStr);
        }
      }
      
      // Set the results
      setAnalysisResults(results);
      setCurrentResearchId(undefined); // Clear previous ID when starting new analysis
      setCurrentView('results');
      
      // Remove automatic saving of entire collection
      // Users should explicitly save what they want through the Save button on cards
      // This prevents duplicate entries in history
      
      console.log('Analysis completed - results ready for review. User can now save individual products.');

      // Update state
      setAnalysisResults(results);
      setCurrentView('results');
      setIsSubmitting(false);

      // Save this state to localStorage
      const stateToSave = {
        currentView: 'results',
        showHistory: false,
        isViewingResults: true, // Explicitly mark that we're viewing results
        lastView: 'results', // Set last view to results
        // No currentResearchId here because this is a new unsaved result
      };
      localStorage.setItem('bofu_app_state', JSON.stringify(stateToSave));
      
      // Also save to sessionStorage for tab-specific state
      sessionStorage.setItem('bofu_current_view', 'results');
      sessionStorage.setItem('bofu_viewing_results', 'true');
      // Don't set research ID since this is a new unsaved result
      sessionStorage.removeItem('bofu_research_id');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred while analyzing the product data.');
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
    // For unauthenticated users, show auth view
    if (currentView === 'auth' || !user) {
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
                      <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-primary-400 bg-clip-text text-transparent">BOFU AI</span>
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
                BOFU AI Research Assistant
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

    if (currentView === 'admin' && isAdmin) {
      return <AdminDashboard onLogout={handleAdminLogout} />;
    }
    
    if (currentView === 'results') {
      return renderResultsPage();
    }

    if (currentView === 'history') {
      return (
        <div className="flex flex-col min-h-screen">
          <MainHeader 
            user={user}
            showHistory={showHistory} 
            setShowHistory={(value) => {
              console.log("Setting showHistory from history view:", value);
              setShowHistory(value);
              // When leaving history view, update current view
              if (!value) {
                setCurrentView('main');
                
                // Explicitly update localStorage
                try {
                  const savedState = localStorage.getItem('bofu_app_state');
                  if (savedState) {
                    const parsedState = JSON.parse(savedState);
                    parsedState.showHistory = false;
                    parsedState.currentView = 'main';
                    localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
                    console.log('Explicitly updated localStorage when leaving history view');
                  }
                } catch (error) {
                  console.error('Error updating localStorage when leaving history:', error);
                }
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
                  localStorage.setItem('bofu_app_state', JSON.stringify(parsedState));
                  console.log('Explicitly updated localStorage when entering history view');
                }
              } catch (error) {
                console.error('Error updating localStorage when entering history:', error);
              }
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