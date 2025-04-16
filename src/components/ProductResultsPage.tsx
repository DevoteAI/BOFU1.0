import React, { useEffect, useState } from 'react';
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

interface ProductResultsPageProps {
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
  const [editedProducts, setEditedProducts] = React.useState(products);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savingProductIndex, setSavingProductIndex] = React.useState<number | null>(null);
  const [actionLoadingIndex, setActionLoadingIndex] = React.useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  // Get the current user from Supabase
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    
    getCurrentUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
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
    if (products.length > 0 && JSON.stringify(products) !== JSON.stringify(editedProducts)) {
      console.log("Updating editedProducts from props:", products.length);
      setEditedProducts(products);
      
      // Also save to session storage immediately
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(products));
    }
  }, [products]);

  // Save products to session storage whenever they change
  React.useEffect(() => {
    if (editedProducts.length > 0) {
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
      console.log("Saved products to session storage:", editedProducts.length);
      
      // Notify parent component of the changes
      // This ensures App.tsx knows about the product changes
      if (editedProducts !== products) {
        window.dispatchEvent(new CustomEvent('productsUpdated', { 
          detail: { products: editedProducts } 
        }));
      }
    }
  }, [editedProducts, products]);

  // Handle product updates (when editing a field)
  const updateProduct = (index: number, updatedProduct: ProductAnalysis) => {
    setEditedProducts((prev) => {
      const updatedProducts = [...prev];
      updatedProducts[index] = updatedProduct;
      
      // Immediately save to session storage
      sessionStorage.setItem('bofu_edited_products', JSON.stringify(updatedProducts));
      
      return updatedProducts;
    });
  };

  // Add visibility change handler with focus on tab switching
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Try to restore products when tab becomes visible
        const savedProducts = sessionStorage.getItem('bofu_edited_products');
        if (savedProducts) {
          try {
            const parsedProducts = JSON.parse(savedProducts);
            if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
              console.log("Tab visible: Restoring products from session storage:", parsedProducts.length);
              setEditedProducts(parsedProducts);
              
              // Force the tab to stay in results view
              window.setTimeout(() => {
                document.title = "Product Results - BOFU AI";
                // Dispatch an event that App.tsx can listen for
                window.dispatchEvent(new CustomEvent('forceResultsView', { 
                  detail: { products: parsedProducts } 
                }));
              }, 100);
            }
          } catch (error) {
            console.error("Error parsing saved products on visibility change:", error);
          }
        }
      } else if (document.visibilityState === 'hidden') {
        // Save current state when tab becomes hidden
        if (editedProducts.length > 0) {
          console.log("Tab hidden: Saving current products to session storage:", editedProducts.length);
          sessionStorage.setItem('bofu_edited_products', JSON.stringify(editedProducts));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [editedProducts]);

  // Fix products with missing details
  React.useEffect(() => {
    const fixedProducts = editedProducts.map(product => {
      if (!product.productDetails) {
        return {
          ...product,
          productDetails: {
            name: 'Unnamed Product',
            description: 'No description available'
          }
        };
      }
      return product;
    });
    
    if (JSON.stringify(fixedProducts) !== JSON.stringify(editedProducts)) {
      setEditedProducts(fixedProducts);
    }
  }, [editedProducts]);

  // --- Consolidated Save/Update Logic --- 
  const performSaveOrUpdate = async (productIndexToMarkLoading: number | null, updatedProductsData: ProductAnalysis[], isApprovalAction: boolean = false) => {
    if (productIndexToMarkLoading !== null) {
      setActionLoadingIndex(productIndexToMarkLoading);
    }
    setIsSaving(true); // Use general saving flag for simplicity or keep separate if needed
    
    try {
      // Determine title based on whether we're saving a single product or multiple products
      let title;
      if (updatedProductsData.length === 1) {
        // For a single product, use a simple title format
        title = `${updatedProductsData[0]?.companyName || 'Unknown'} - ${updatedProductsData[0]?.productDetails?.name || 'Product'}`;
      } else {
        // For multiple products, indicate the count
        title = `${updatedProductsData[0]?.companyName || 'Unknown'} - ${updatedProductsData.length} Products`;
      }
      
      let operationPerformed: 'insert' | 'update' = 'update';
      let currentId = existingId;

      if (currentId) {
        // --- UPDATE --- 
        console.log(`[ProductResultsPage] Updating existing result ID: ${currentId}`);
        await updateResearchResults(currentId, updatedProductsData, title);
        toast.success(isApprovalAction 
          ? 'Product approved successfully!' 
          : updatedProductsData.length === 1 
            ? `Saved "${updatedProductsData[0]?.productDetails?.name || 'Product'}" analysis` 
            : `Updated ${updatedProductsData.length} products analysis`);
      } else {
        // --- INSERT --- 
        console.log('[ProductResultsPage] No existing ID, saving as new result...');
        operationPerformed = 'insert';
        // Ensure is_draft is false if saving via approve
        const newId = await saveResearchResults(updatedProductsData, title, false);
        currentId = newId; // Store the new ID
        toast.success(isApprovalAction 
          ? 'Product saved and approved successfully!' 
          : updatedProductsData.length === 1 
            ? `Saved "${updatedProductsData[0]?.productDetails?.name || 'Product'}" to history` 
            : `Saved ${updatedProductsData.length} products to history`);
        // IMPORTANT: Notify parent about the new ID
        if (onSaveComplete) {
          console.log(`[ProductResultsPage] Calling onSaveComplete with new ID: ${newId}`);
          onSaveComplete(newId);
        } else {
           console.warn('[ProductResultsPage] onSaveComplete callback is missing. Parent component will not know the new ID.');
        }
      }

      // Update local state AFTER successful DB operation
      setEditedProducts(updatedProductsData);

      // Refresh history list if callback provided without navigation
      if (onHistorySave) {
        // Just refresh the history data in the background without navigating
        await onHistorySave();
      }
      
      return { success: true, id: currentId, operation: operationPerformed };

    } catch (error: any) {
      console.error('Error saving/updating product:', error);
      toast.error(`Failed to ${existingId ? 'update' : 'save'} analysis: ${error.message}`);
      return { success: false };
    } finally {
      if (productIndexToMarkLoading !== null) {
        setActionLoadingIndex(null);
      }
      setIsSaving(false); 
    }
  };

  // --- Original Save Button Handler --- 
  // When clicking "Save" on a specific product card, we only want to save that 
  // specific product, not all products. This ensures that history entries contain 
  // only individual products, not collections of products.
  const handleSaveProduct = async (product: ProductAnalysis, index: number) => {
    // Create a deep clone of the product using JSON to ensure no references are shared
    const productDeepCopy = JSON.parse(JSON.stringify(product));
    
    try {
      if (existingId) {
        // Update the existing entry instead of creating a new one
        await updateResearchResults(
          existingId,
          [productDeepCopy], // Keep it as an array for consistency
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
        
        toast.success(`Updated "${product.productDetails?.name || 'Product'}" analysis`);
      } else {
        // Only create a new entry if there isn't an existing one
        const result = await saveResearchResults(
          [productDeepCopy],
          `${product.companyName || 'Unknown'} - ${product.productDetails?.name || 'Product'}`,
          false
        );
        
        toast.success(`Saved "${product.productDetails?.name || 'Product'}" to history`);
        
        // Update the ID if this is a new entry
        if (onSaveComplete) {
          onSaveComplete(result);
        }
      }
      
      // Refresh history list in the background if callback provided
      if (onHistorySave) {
        console.log(`[ProductResultsPage] Refreshing history data in background`);
        await onHistorySave();
      }
    } catch (error: any) {
      console.error('Error saving single product:', error);
      toast.error(`Failed to save product: ${error.message}`);
    }
  };

  // --- Modified Approve Button Handler --- 
  const handleApproveProduct = async (productToApprove: ProductAnalysis, index: number) => {
    setActionLoadingIndex(index);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');
      
      console.log(`[ProductResultsPage] Approving product at index ${index}:`, 
        JSON.stringify(productToApprove.productDetails, null, 2));
      
      // First step: Create a clean product object without any previous approval data
      // This ensures we don't have old or conflicting approval metadata
      const cleanedProduct = JSON.parse(JSON.stringify(productToApprove)); // Deep clone to avoid reference issues
      delete cleanedProduct.isApproved;
      delete cleanedProduct.approvedBy;
      
      // Add approval data to the single product
      const approvedProduct = {
        ...cleanedProduct,
        isApproved: true,
        approvedBy: user.id || 'unknown',
        approvedAt: new Date().toISOString()
      };
      
      try {
        let resultId;
        
        // Only use the existing ID if available, never create a new history entry
        if (!existingId) {
          console.error('[ProductResultsPage] Cannot approve product without existing ID');
          throw new Error('Cannot approve this product. Please save it first.');
        }
        
        resultId = existingId;
        
        // Update the product in the existing array
        const updatedProducts = [...editedProducts];
        updatedProducts[index] = approvedProduct;
        
        // Update the existing entry in research_results
        await updateResearchResults(
          resultId, 
          updatedProducts,
          `${approvedProduct.companyName || 'Unknown'} - ${approvedProduct.productDetails?.name || 'Product'}`, 
          false
        );
        
        // Add to the approved_products table
        await saveApprovedProduct(
          resultId, 
          approvedProduct, 
          index, // Keep the original index
          user.id
        );
        
        console.log(`[ProductResultsPage] Successfully added product to approved_products table without creating new history entry`);
        
        // Show success message
        toast.success(`Product "${productToApprove.productDetails?.name}" has been approved and sent to admin dashboard`);
        
        // Update UI state to reflect approval (only for this product)
        setEditedProducts(updatedProducts);
        
        // Refresh history list in the background
        if (onHistorySave) {
          console.log(`[ProductResultsPage] Refreshing history after approval`);
          await onHistorySave();
        }
      } catch (error: any) {
        console.error('[ProductResultsPage] Error during approval save:', error);
        toast.error(`Failed to approve product: ${error.message}`);
      }
    } catch (error: any) {
      console.error('[ProductResultsPage] Error during approval preparation:', error);
      toast.error(`Failed to approve product: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  };

  // --- Update Section Handler --- 
  const updateProductSection = (productIndex: number, section: keyof ProductAnalysis, value: any) => {
    const newProducts = [...editedProducts];
    // Ensure nested properties are updated correctly (example for productDetails)
    if (section === 'productDetails') {
       newProducts[productIndex] = {
         ...newProducts[productIndex],
         productDetails: { ...newProducts[productIndex].productDetails, ...value }
       };
    } else {
       newProducts[productIndex] = {
         ...newProducts[productIndex],
         [section]: value
       };
    }
    setEditedProducts(newProducts);
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
          if (setShowHistory) {
            setShowHistory(show);
          }
          // Don't handle navigation here - let MainHeader handle it
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
        <div className={`grid grid-cols-1 ${editedProducts.length > 1 ? 'xl:grid-cols-2' : 'max-w-3xl mx-auto'} gap-8`}>
          {editedProducts.map((product, index) => {
            const isLoadingThis = actionLoadingIndex === index; // Check if this card is loading
            return (
              <ProductCard
                key={index}
                product={product}
                index={index}
                isActionLoading={isLoadingThis}
                onSave={handleSaveProduct} 
                onApprove={handleApproveProduct} 
                onUpdateSection={updateProductSection}
                updateProduct={(updatedProduct) => { 
                  const newProducts = [...editedProducts];
                  newProducts[index] = updatedProduct;
                  setEditedProducts(newProducts);
                }}
                isMultipleProducts={editedProducts.length > 1}
                isAdmin={false}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ProductResultsPage };