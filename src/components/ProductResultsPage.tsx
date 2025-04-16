import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { 
  saveResearchResults, 
  updateResearchResults, 
  ResearchResult, 
  saveApprovedProduct 
} from '../lib/research';
import { ProductCard } from './product/ProductCard';
import { PageHeader } from './product/PageHeader';
import { ProductAnalysis } from '../types/product';
import { Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ProductResultsPageProps {
  products: ProductAnalysis[];
  onStartNew: () => void;
  existingId?: string;
  showHistory?: boolean;
  setShowHistory?: (show: boolean) => void;
  forceHistoryView?: () => void;
  onHistorySave?: () => Promise<void>;
  onSaveComplete?: (newId: string) => void;
}

function ProductResultsPage({ 
  products, 
  onStartNew, 
  existingId,
  showHistory,
  setShowHistory,
  forceHistoryView,
  onHistorySave,
  onSaveComplete
}: ProductResultsPageProps) {
  const [editedProducts, setEditedProducts] = useState(products);
  const [isSaving, setIsSaving] = useState(false);
  const [savingProductIndex, setSavingProductIndex] = useState<number | null>(null);
  const [actionLoadingIndex, setActionLoadingIndex] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasSavedToHistory, setHasSavedToHistory] = useState(!!existingId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Debug: Log the products received
  console.log('Debug - ProductResultsPage received props:', {
    productsCount: products.length,
    productsData: products,
    editedProductsCount: editedProducts.length,
    editedProductsData: editedProducts,
    existingId
  });
  
  // Replace the state with a ref to better track across renders
  const initialSaveRef = useRef({
    inProgress: false,
    completed: false,
    attemptCount: 0,
    savedId: null as string | null,
    productsHash: ""
  });

  // Create a function to generate a hash of products for comparing
  const getProductsHash = (prods: ProductAnalysis[]) => {
    if (!prods || prods.length === 0) return "";
    // Use first product company + length as a simple hash
    return `${prods[0]?.companyName || "unknown"}-${prods.length}`;
  };

  // Get the current user from Supabase
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getCurrentUser();
  }, []);

  // Add logging for component mounting and prop changes
  React.useEffect(() => {
    console.log("ProductResultsPage mounted or updated with props:", { 
      productsCount: products.length,
      showHistory,
      setShowHistoryType: typeof setShowHistory
    });
    
    // Try to restore products from session storage
    const savedProducts = sessionStorage.getItem('bofu_edited_products');
    if (savedProducts) {
      try {
        const parsedProducts = JSON.parse(savedProducts);
        if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
          setEditedProducts(parsedProducts);
          console.log("Restored products from session storage:", parsedProducts.length);
        }
      } catch (error) {
        console.error("Error parsing saved products:", error);
      }
    }
    
    return () => {
      console.log("ProductResultsPage unmounting");
    };
  }, [products, showHistory, setShowHistory]);

  // Update the products state when props change
  React.useEffect(() => {
    console.log("Products prop changed:", { 
      productCount: products?.length || 0, 
      hasProducts: Array.isArray(products) && products.length > 0
    });
    
    if (Array.isArray(products) && products.length > 0) {
      setEditedProducts(products);
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(products));
      
      // If there's an existingId, we have already saved the results
      if (existingId) {
        setHasSavedToHistory(true);
      } else {
        setHasSavedToHistory(false);
        setHasUnsavedChanges(true);
      }
      
      // Important: force a re-render to ensure products are displayed
      console.log("Setting products to state:", products.length);
      
      // Log first product for debugging
      if (products[0]) {
        console.log("First product sample:", {
          companyName: products[0].companyName,
          productName: products[0].productDetails?.name,
          hasCompetitors: !!products[0].competitors
        });
      }
    } else {
      console.warn("Received empty or invalid products array", products);
      
      // Try to restore products from session storage
      const savedProducts = sessionStorage.getItem('bofu_edited_products');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts);
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            console.log("Restored products from session storage:", parsedProducts.length);
            setEditedProducts(parsedProducts);
          }
        } catch (error) {
          console.error("Error parsing saved products:", error);
        }
      }
    }
  }, [products, existingId]);

  // Reset the initialSaveRef when existingId changes or component unmounts
  React.useEffect(() => {
    if (existingId) {
      // We already have an ID, so no need for initial save
      initialSaveRef.current = {
        inProgress: false,
        completed: true,
        attemptCount: 0,
        savedId: existingId,
        productsHash: getProductsHash(products)
      };
    }
    
    return () => {
      // Reset on unmount
      initialSaveRef.current = {
        inProgress: false,
        completed: false,
        attemptCount: 0,
        savedId: null,
        productsHash: ""
      };
    };
  }, [existingId, products]);

  // Remove the duplicate save effect and keep only the state sync effect
  React.useEffect(() => {
    if (editedProducts.length > 0) {
      // Only sync to session storage and notify parent
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
      console.log("Synced products to session storage:", editedProducts.length);
      
      // Notify parent component of the changes
      if (editedProducts !== products) {
        window.dispatchEvent(new CustomEvent('productsUpdated', { 
          detail: { products: editedProducts } 
        }));
      }
    }
  }, [editedProducts, products]);

  // Handle save all products to history
  const handleSaveAllToHistory = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Create title from the first product
      const title = editedProducts.length === 1 
        ? `${editedProducts[0]?.companyName || 'Unknown'} - ${editedProducts[0]?.productDetails?.name || 'Product'}`
        : `${editedProducts[0]?.companyName || 'Unknown'} - ${editedProducts.length} Products`;
      
      if (existingId) {
        // Update existing history entry
        await updateResearchResults(existingId, editedProducts, title, false);
        toast.success('Analysis updated in history');
      } else {
        // Create new history entry
        const newId = await saveResearchResults(editedProducts, title, false);
        
        // Update the app state with the new ID
        if (onSaveComplete) {
          onSaveComplete(newId);
        }
        
        setHasSavedToHistory(true);
        toast.success('Analysis saved to history');
      }
      
      // Refresh the history list
      if (onHistorySave) {
        await onHistorySave();
      }
      
      // Reset the unsaved changes flag
      setHasUnsavedChanges(false);
      
    } catch (error: any) {
      console.error('Error saving to history:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle individual product save function required by ProductCard
  const handleProductSave = async (product: ProductAnalysis, index: number): Promise<void> => {
    if (actionLoadingIndex !== null || isSaving) {
      return;
    }
    
    setActionLoadingIndex(index);
    
    try {
      // Create a deep copy
      const productDeepCopy = JSON.parse(JSON.stringify(product));
      const currentProducts = [...editedProducts];
      currentProducts[index] = productDeepCopy;
      
      if (existingId) {
        // If we have an ID, update the existing entry with this product change
        await updateResearchResults(
          existingId,
          currentProducts,
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
        
        toast.success(`Updated "${product.productDetails?.name || 'Product'}" analysis`);
        
        // Refresh history
        if (onHistorySave) {
          await onHistorySave();
        }
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
      } else {
        // Just update local state and indicate unsaved changes
        toast.success(`Changes saved locally. Click "Save to History" to permanently save.`);
        setHasUnsavedChanges(true);
      }
      
      // Always update the local state
      setEditedProducts(currentProducts);
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(currentProducts));
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  };

  // Handle updating a section of a product
  const handleUpdateSection = (productIndex: number, section: keyof ProductAnalysis, value: any): void => {
    const updatedProducts = [...editedProducts];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      [section]: value
    };
    
    setEditedProducts(updatedProducts);
    setHasUnsavedChanges(true);
    sessionStorage.setItem('bofu_edited_products', JSON.stringify(updatedProducts));
  };

  // Update an entire product
  const handleUpdateProduct = (updatedProduct: ProductAnalysis): void => {
    setHasUnsavedChanges(true);
  };

  // Handle approve function required by ProductCard
  const handleProductApprove = async (product: ProductAnalysis, index: number): Promise<void> => {
    if (!user) {
      toast.error('You must be logged in to approve products');
      return;
    }
    
    if (actionLoadingIndex !== null) {
      return;
    }
    
    setActionLoadingIndex(index);
    
    try {
      if (!existingId && !hasSavedToHistory) {
        toast.error('You must save to history first before approving products');
        return;
      }
      
      const researchId = existingId as string;
      
      // Save the product to the approved_products table
      await saveApprovedProduct(
        researchId,
        product,
        index,
        user.id
      );
      
      toast.success(`Added "${product.productDetails?.name || 'Product'}" to review queue`);
      
      // Mark the product as approved in the local state
      const updatedProducts = [...editedProducts];
      updatedProducts[index] = {
        ...updatedProducts[index],
        isApproved: true,
        approvedBy: user.id
      };
      
      setEditedProducts(updatedProducts);
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(updatedProducts));
      
      // Update the history entry with the approved flag
      if (existingId) {
        await updateResearchResults(
          existingId,
          updatedProducts,
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
      }
      
    } catch (error: any) {
      console.error('Error approving product:', error);
      toast.error(`Failed to approve: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  };

  // Add a new effect to handle history navigation
  React.useEffect(() => {
    const handleHistoryNavigation = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      console.log("History navigation event received in ProductResultsPage");
      
      // Save current products state to session storage before navigation
      if (editedProducts.length > 0) {
        sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
        console.log("Saved products before history navigation:", editedProducts.length);
      }
      
      // Update state
      if (setShowHistory) {
        setShowHistory(true);
      }
      
      // Don't prevent default navigation
      if (forceHistoryView) {
        console.log("Forcing history view from product results");
        forceHistoryView();
      }
    };

    // Listen for history view changes
    window.addEventListener('historyViewChange', handleHistoryNavigation);

    return () => {
      window.removeEventListener('historyViewChange', handleHistoryNavigation);
    };
  }, [setShowHistory, forceHistoryView, editedProducts]);

  // Add effect to handle page unload
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save current state before unload
      if (editedProducts.length > 0) {
        sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
        console.log("Saved products before unload:", editedProducts.length);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editedProducts]);

  return (
    <div className="min-h-screen bg-gradient-dark bg-circuit-board">
      {/* Header Section */}
      <PageHeader 
        companyName={editedProducts[0]?.companyName} 
        productCount={editedProducts.length}
        onStartNew={onStartNew}
        showHistory={showHistory}
        setShowHistory={(show) => {
          console.log("Setting history state in ProductResultsPage:", show);
          
          // Update React state if needed
          if (setShowHistory) {
            setShowHistory(show);
          }
          
          // Use the hybrid navigation approach
          if (show) {
            console.log("Navigating to history using hybrid approach");
            sessionStorage.setItem('bofu_viewing_history', 'true');
            sessionStorage.setItem('bofu_current_view', 'history');
            sessionStorage.setItem('bofu_viewing_results', 'false');
            
            // Use history state API
            const historyURL = window.location.origin + '/history';
            window.history.pushState({}, '', historyURL);
            
            // Dispatch a popstate event to notify the app the URL has changed
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
          } else {
            console.log("Navigating to main using hybrid approach");
            sessionStorage.setItem('bofu_viewing_history', 'false');
            sessionStorage.setItem('bofu_current_view', 'main');
            sessionStorage.setItem('bofu_viewing_results', 'false');
            
            // Use history state API
            const mainURL = window.location.origin + '/';
            window.history.pushState({}, '', mainURL);
            
            // Dispatch a popstate event to notify the app the URL has changed
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
          }
        }}
        forceHistoryView={forceHistoryView}
        hideHistoryButton={true}
      />

      {/* Instructions Panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-secondary-900/80 backdrop-blur-sm rounded-xl border-2 border-primary-500/20 shadow-glow p-6">
          <div className="flex items-start space-x-4">
            <div className="min-w-[24px] mt-1">
              <div className="w-6 h-6 rounded-full bg-secondary-800 border border-primary-500/30 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-400">i</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-primary-400 mb-2">How to Complete Your Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-800 border border-primary-500/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-400">1</span>
                  </div>
                  <p>Click <span className="font-medium text-primary-400">Identify Competitors</span> to let AI automatically discover and analyze your competitors</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-800 border border-primary-500/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-400">2</span>
                  </div>
                  <p>Optionally, use <span className="font-medium text-primary-400">Add Competitor Manually</span> to include additional competitors you know</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-800 border border-primary-500/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-400">3</span>
                  </div>
                  <p>Click <span className="font-medium text-primary-400">Analyze Competitors</span> to generate a detailed competitive analysis report</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-800 border border-primary-500/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-400">4</span>
                  </div>
                  <p>Finally, click <span className="font-medium text-primary-500">Save Analysis</span> to preserve your results</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`flex flex-col gap-6`}>
          {/* Header with actions */}
          <div className="flex items-center justify-between sticky top-0 z-20 pt-4 pb-2 bg-white dark:bg-gray-900">
            <h1 className="text-2xl font-bold tracking-tight">
              {editedProducts.length === 1 
                ? 'Product Analysis' 
                : `Product Analysis (${editedProducts.length})`}
            </h1>
            
            <div className="flex gap-2">
              {/* Save to History Button - only show if unsaved or has changes */}
              {(!hasSavedToHistory || hasUnsavedChanges) && (
                <button
                  onClick={handleSaveAllToHistory}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {existingId ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {existingId ? 'Update in History' : 'Save to History'}
                    </>
                  )}
                </button>
              )}
              
              {hasSavedToHistory && !hasUnsavedChanges && (
                <div className="flex items-center text-sm text-green-600 dark:text-green-400 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Saved to History
                </div>
              )}
              
              {/* Start New Button */}
              <button 
                onClick={onStartNew} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Start New
              </button>
            </div>
          </div>
          
          {/* Status message */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm dark:bg-yellow-900/20 dark:border-yellow-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    You have unsaved changes. Click <strong>"{existingId ? 'Update in History' : 'Save to History'}"</strong> to permanently save your analysis.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Help text for new users */}
          {!hasSavedToHistory && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded shadow-sm dark:bg-blue-900/20 dark:border-blue-600">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    This analysis has not been saved yet. Edit individual products if needed, then click <strong>"Save to History"</strong> to save this analysis to your history.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Products grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {editedProducts && editedProducts.length > 0 ? (
              editedProducts.map((product, index) => (
                <motion.div
                  key={`${product.companyName}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard 
                    product={product}
                    index={index}
                    onSave={handleProductSave}
                    onApprove={handleProductApprove}
                    onUpdateSection={handleUpdateSection}
                    updateProduct={handleUpdateProduct}
                    isActionLoading={actionLoadingIndex === index}
                    isMultipleProducts={editedProducts.length > 0}
                    isAdmin={false}
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-1 lg:col-span-2 p-8 text-center">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m0 16v1m-8-8h1m16 0h1M5.6 5.6l.8.8m12 12l-.8-.8m-12 0l.8-.8m12-12l-.8.8" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-primary-400 mb-2">No Analysis Results Found</h3>
                <p className="text-gray-400 mb-4">We couldn't find any product analysis results to display.</p>
                <button 
                  onClick={onStartNew} 
                  className="px-4 py-2 bg-primary-500 text-secondary-900 rounded-lg font-medium hover:bg-primary-400 transition-colors"
                >
                  Start New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductResultsPage;