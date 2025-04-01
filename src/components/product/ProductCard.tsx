import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductAnalysis } from '../../types/product';
import { ProductHeader } from './ProductHeader';
import { ProductSection } from './ProductSection';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { ProductDescription } from './ProductDescription';
import { ProductFeatures } from './ProductFeatures';
import { TargetPersona } from './TargetPersona';
import { Capabilities } from './Capabilities';
import { Loader2, Save } from 'lucide-react';

interface ProductCardProps {
  product: ProductAnalysis;
  index: number;
  isSaving: boolean;
  onSave: (product: ProductAnalysis, index: number) => Promise<void>;
  onUpdateSection: (productIndex: number, section: keyof ProductAnalysis, value: any) => void;
  updateProduct: (product: ProductAnalysis) => void;
  isMultipleProducts: boolean;
}

export function ProductCard({
  product,
  index,
  isSaving,
  onSave,
  onUpdateSection,
  updateProduct,
  isMultipleProducts
}: ProductCardProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  
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

  return (
    <motion.article
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500 ${
        !isMultipleProducts ? 'mx-auto w-full' : ''
      }`}
    >
      <ProductHeader 
        product={product}
        index={index}
        updateProduct={(updatedProduct) => updateProduct(updatedProduct)}
      />
      
      {/* Product Content */}
      <div className="p-6 space-y-6 relative">
        <CompetitorAnalysis 
          product={product}
          onUpdate={(url) => {
            const updatedProduct = { ...product, competitorAnalysisUrl: url };
            updateProduct(updatedProduct);
          }}
        />

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

        {/* Save Button - Moved to bottom */}
        <motion.div 
          className="flex justify-end mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            onClick={() => !isSaving && onSave(product, index)}
            disabled={isSaving}
            className="px-4 py-2 bg-white border-2 border-success-200 text-success-700 rounded-lg hover:bg-success-50 
              transition-all flex items-center gap-2 group shadow-sm hover:shadow-lg hover:shadow-success-100/50
              disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving Product...
              </>
            ) : (
              <>
                <Save size={18} className="group-hover:text-success-600" />
                Save Product
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.article>
  );
} 