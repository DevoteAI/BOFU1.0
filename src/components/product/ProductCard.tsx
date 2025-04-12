import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductAnalysis, CompetitorsData } from '../../types/product/types';
import { ProductHeader } from './ProductHeader';
import { ProductSection } from './ProductSection';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { ProductDescription } from './ProductDescription';
import { TargetPersona } from './TargetPersona';
import { Capabilities } from './Capabilities';
import { Loader2, Save, CheckSquare, Send } from 'lucide-react';
import { sendToAirOps } from '../../lib/airops';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: ProductAnalysis;
  index: number;
  isActionLoading: boolean;
  onSave: (product: ProductAnalysis, index: number) => Promise<void>;
  onApprove: (product: ProductAnalysis, index: number) => Promise<void>;
  onUpdateSection: (productIndex: number, section: keyof ProductAnalysis, value: any) => void;
  updateProduct: (product: ProductAnalysis) => void;
  isMultipleProducts: boolean;
  isAdmin?: boolean;
}

function ProductCard({
  product,
  index,
  isActionLoading,
  onSave,
  onApprove,
  onUpdateSection,
  updateProduct,
  isMultipleProducts,
  isAdmin = false
}: ProductCardProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [originalApprovedProduct, setOriginalApprovedProduct] = React.useState<ProductAnalysis | null>(null);
  const [isSendingToAirOps, setIsSendingToAirOps] = React.useState(false);
  
  // Track the original approved state
  React.useEffect(() => {
    // If product becomes approved, save the original state
    if ((product.isApproved === true || !!product.approvedBy) && !originalApprovedProduct) {
      console.log('[ProductCard] Saving original approved product state:', product.productDetails?.name);
      setOriginalApprovedProduct(JSON.parse(JSON.stringify(product)));
    }
    
    // If product was previously approved, check for changes
    if (originalApprovedProduct) {
      const currentProductStr = JSON.stringify(product);
      const originalProductStr = JSON.stringify(originalApprovedProduct);
      
      // If content changed (excluding approval metadata), mark as having unsaved changes
      const hasChanged = currentProductStr !== originalProductStr;
      setHasUnsavedChanges(hasChanged);
      
      console.log(`[ProductCard] Product ${product.productDetails?.name} changes detected:`, 
        hasChanged ? 'Product has been modified since approval' : 'No changes since approval');
    }
  }, [product, originalApprovedProduct]);

  // Reset original state if explicitly requested
  const resetOriginalState = () => {
    setOriginalApprovedProduct(null);
    setHasUnsavedChanges(false);
  };
  
  // Each section is collapsed by default
  React.useEffect(() => {
    if (product.productDetails?.name && Object.keys(expandedSections).length === 0) {
      const initialExpanded: Record<string, boolean> = {
        [`${product.productDetails.name}-description`]: true, // Only description expanded by default
        [`${product.productDetails.name}-usps`]: false,
        [`${product.productDetails.name}-painPoints`]: false,
        [`${product.productDetails.name}-features`]: false,
        [`${product.productDetails.name}-persona`]: false,
        [`${product.productDetails.name}-capabilities`]: false,
      };
      setExpandedSections(initialExpanded);
    }
  }, [product.productDetails?.name, expandedSections]);

  const toggleSection = (section: string) => {
    const productName = product.productDetails?.name || `Product-${index}`;
    const sectionKey = `${productName}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const isSectionExpanded = (section: string) => {
    const productName = product.productDetails?.name || `Product-${index}`;
    const sectionKey = `${productName}-${section}`;
    return expandedSections[sectionKey] || false;
  };

  // Helper for updating nested properties
  const updateNestedProperty = (obj: any, path: string[], value: any) => {
    const newObj = { ...obj };
    let current = newObj;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    return newObj;
  };

  // Custom approve handler that handles re-approvals
  const handleApprove = async () => {
    // Reset the original state to mark this as a fresh approval
    resetOriginalState();
    
    // Call the parent's onApprove
    await onApprove(product, index);
  };

  const handleSendToAirOps = async () => {
    setIsSendingToAirOps(true);
    
    try {
      // Create a clean copy of the product with required fields
      const preparedProduct = {
        ...product,
        // Make sure all required properties exist with correct types
        competitors: product.competitors || {
          direct_competitors: [],
          niche_competitors: [],
          broader_competitors: []
        },
        usps: product.usps || [],
        painPoints: product.painPoints || [],
        features: product.features || []
      };
      
      await sendToAirOps(preparedProduct);
      toast.success('Successfully sent to AirOps workflow');
    } catch (error: any) {
      // Display more detailed error message
      console.error('Full error details:', error);
      
      if (error.message && error.message.includes('ACCOUNT_LIMITATION')) {
        // This is the specific free tier limitation error
        toast.error('Your AirOps account needs to be upgraded. Please contact AirOps support.', {
          duration: 6000, // Show longer for important message
          icon: '⚠️',
        });
      } else if (error.message && error.message.includes('NetworkError')) {
        toast.error('Network error: Please check your internet connection');
      } else if (error.message && error.message.includes('Failed to fetch')) {
        toast.error('Connection to AirOps failed. This could be due to CORS restrictions.');
      } else {
        toast.error(`Failed to send to AirOps: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsSendingToAirOps(false);
    }
  };

  // Use the single loading prop for button states
  const isThisProductSaving = isActionLoading;
  const isThisProductApproving = isActionLoading;

  return (
    <motion.article
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`bg-secondary-900/90 backdrop-blur-sm rounded-2xl shadow-glow overflow-hidden border border-primary-500/20 hover:shadow-glow-strong transition-all duration-500 ${
        !isMultipleProducts ? 'mx-auto w-full' : ''
      }`}
    >
      <ProductHeader 
        product={product}
        index={index}
        updateProduct={(updatedProduct) => updateProduct(updatedProduct)}
      />

      {/* Product Analysis Results Title */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/30 to-primary-500/10 backdrop-blur-sm"></div>
        <div className="relative px-6 py-4">
          <h1 className="text-2xl font-bold text-primary-400">Competitor Analysis Results</h1>
          <p className="text-sm text-gray-400 mt-1">Comprehensive analysis of your product's market position</p>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-6 space-y-6 relative">
        <ProductDescription
          description={product.productDetails?.description || 'No description available'}
          onUpdate={(description) => {
            const updatedProduct = updateNestedProperty(
              product, 
              ['productDetails', 'description'], 
              description
            );
            updateProduct(updatedProduct);
          }}
          isExpanded={isSectionExpanded('description')}
          toggleExpanded={() => toggleSection('description')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          <ProductSection
            title="Unique Selling Points"
            items={product.usps || []}
            onUpdate={(items) => onUpdateSection(index, 'usps', items)}
            isExpanded={isSectionExpanded('usps')}
            toggleExpanded={() => toggleSection('usps')}
            sectionType="usps"
          />

          <ProductSection
            title="Pain Points Solved"
            items={product.painPoints || []}
            onUpdate={(items) => onUpdateSection(index, 'painPoints', items)}
            isExpanded={isSectionExpanded('painPoints')}
            toggleExpanded={() => toggleSection('painPoints')}
            sectionType="painPoints"
          />
        </div>

        <ProductSection
          title="Features"
          items={product.features || []}
          onUpdate={(items) => onUpdateSection(index, 'features', items)}
          isExpanded={isSectionExpanded('features')}
          toggleExpanded={() => toggleSection('features')}
          sectionType="features"
        />

        <TargetPersona
          persona={product.targetPersona}
          onUpdate={(persona) => onUpdateSection(index, 'targetPersona', persona)}
          isExpanded={isSectionExpanded('persona')}
          toggleExpanded={() => toggleSection('persona')}
        />

        <Capabilities
          capabilities={product.capabilities || []}
          onUpdate={(capabilities) => onUpdateSection(index, 'capabilities', capabilities)}
          isExpanded={isSectionExpanded('capabilities')}
          toggleExpanded={() => toggleSection('capabilities')}
        />

        <CompetitorAnalysis 
          product={product}
          onUpdate={(url) => {
            console.log("Received competitorAnalysisUrl update:", url);
            
            // Check if the URL is a valid web URL
            try {
              new URL(url);
              // If it's a valid URL, update the product with it directly
              const updatedProduct = { 
                ...product, 
                competitorAnalysisUrl: url
              };
              console.log("Updating product with document URL:", updatedProduct);
              updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
              // Automatically save the product after updating
              onSave(updatedProduct, index);
              return;
            } catch (e) {
              // If not a valid URL, try parsing as JSON
              try {
                const jsonData = JSON.parse(url);
                console.log("Successfully parsed response as JSON:", jsonData);
                
                // If we have a documentUrl in the JSON, use that
                if (jsonData.documentUrl || jsonData.analysisUrl) {
                  const docUrl = jsonData.documentUrl || jsonData.analysisUrl;
                  const updatedProduct = { 
                    ...product, 
                    competitorAnalysisUrl: docUrl
                  };
                  console.log("Updating product with document URL from JSON:", updatedProduct);
                  updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
                  // Automatically save the product after updating
                  onSave(updatedProduct, index);
                  return;
                }
                
                // Check if it contains competitor data
                if (jsonData.competitors && typeof jsonData.competitors === 'object') {
                  console.log("Found competitors in the JSON:", jsonData.competitors);
                  
                  const updatedProduct = { 
                    ...product, 
                    competitorAnalysisUrl: url,
                    competitors: {
                      direct_competitors: Array.isArray(jsonData.competitors.direct_competitors) 
                        ? [...jsonData.competitors.direct_competitors] : [],
                      niche_competitors: Array.isArray(jsonData.competitors.niche_competitors)
                        ? [...jsonData.competitors.niche_competitors] : [],
                      broader_competitors: Array.isArray(jsonData.competitors.broader_competitors)
                        ? [...jsonData.competitors.broader_competitors] : []
                    }
                  };
                  
                  console.log("Updating product with competitors:", updatedProduct);
                  updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
                  // Automatically save the product after updating
                  onSave(updatedProduct, index);
                }
              } catch (e) {
                console.log("Response is not a valid JSON string:", e);
              }
            }
          }}
          onUpdateCompetitors={(competitors) => {
            const updatedProduct = { ...product, competitors };
            updateProduct(JSON.parse(JSON.stringify(updatedProduct)));
          }}
        />

        {/* Buttons Section */}
        <div className="flex flex-wrap gap-3 justify-end mt-6">
          {/* Only render the Send to AirOps button if user is admin */}
          {isAdmin && (
            <button
              onClick={handleSendToAirOps}
              disabled={isSendingToAirOps}
              className="flex items-center gap-2 px-4 py-2 bg-purple-700/80 rounded-md text-white hover:bg-purple-600 transition-colors"
            >
              {isSendingToAirOps ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to AirOps
            </button>
          )}
          
          <button
            onClick={() => onSave(product, index)}
            disabled={isThisProductSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600/80 rounded-md text-white hover:bg-primary-500 transition-colors"
          >
            {isThisProductSaving ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
          
          <button
            onClick={handleApprove}
            disabled={isThisProductApproving || (!!product.isApproved && !hasUnsavedChanges)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-white transition-colors ${
              product.isApproved && !hasUnsavedChanges
                ? 'bg-green-500/30 cursor-not-allowed'
                : 'bg-green-600/80 hover:bg-green-500'
            }`}
          >
            {isThisProductApproving ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            {product.isApproved && !hasUnsavedChanges
              ? 'Approved'
              : product.isApproved && hasUnsavedChanges
              ? 'Re-approve'
              : 'Approve'}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export { ProductCard };