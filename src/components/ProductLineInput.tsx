import React, { useState } from 'react';
import { Plus, X, Tag, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductLineInputProps {
  onProductLinesChange: (productLines: string[]) => void;
}

export function ProductLineInput({ onProductLinesChange }: ProductLineInputProps) {
  const [productLines, setProductLines] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addProductLine = () => {
    if (inputValue.trim() !== '') {
      const updatedLines = [...productLines, inputValue.trim()];
      setProductLines(updatedLines);
      setInputValue('');
      onProductLinesChange(updatedLines);
    }
  };

  const removeProductLine = (index: number) => {
    const updatedLines = productLines.filter((_, i) => i !== index);
    setProductLines(updatedLines);
    onProductLinesChange(updatedLines);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProductLine();
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <div className="w-full space-y-4">
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-medium">Product Lines</h3>
        <p className="text-sm text-neutral-500">
          Add your product lines to tailor the research to your specific offerings and market segments.
        </p>
      </motion.div>

      <motion.div 
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Tag size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter product line (e.g., Enterprise SaaS, Consumer Mobile)"
            className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        </div>
        <motion.button
          onClick={addProductLine}
          disabled={inputValue.trim() === ''}
          className={`flex items-center justify-center h-[42px] px-4 rounded-lg transition-all ${
            inputValue.trim() === '' 
              ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' 
              : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
          }`}
          whileHover={inputValue.trim() !== '' ? { scale: 1.03 } : {}}
          whileTap={inputValue.trim() !== '' ? { scale: 0.97 } : {}}
        >
          <Plus size={18} className="mr-1" /> Add Product
        </motion.button>
      </motion.div>

      {productLines.length > 0 && (
        <motion.div className="mt-4" variants={container} initial="hidden" animate="show">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-700">Added Product Lines</h4>
            {productLines.length > 1 && (
              <button 
                onClick={() => {
                  setProductLines([]);
                  onProductLinesChange([]);
                }}
                className="text-xs text-red-600 hover:text-red-800 flex items-center"
              >
                <Trash2 size={12} className="mr-1" />
                Remove all
              </button>
            )}
          </div>
          
          <motion.div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {productLines.map((line, index) => (
                <motion.div
                  key={index}
                  variants={item}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.8,
                    transition: { duration: 0.2 } 
                  }}
                  layout
                  className="flex items-center bg-primary-50 border border-primary-100 text-primary-800 px-3 py-1.5 rounded-lg group hover:bg-primary-100 transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  <Tag size={12} className="mr-1.5 text-primary-600" />
                  <span className="text-sm font-medium mr-1">{line}</span>
                  <button
                    onClick={() => removeProductLine(index)}
                    className="p-0.5 rounded-full hover:bg-primary-200 opacity-70 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} className="text-primary-700" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
      
      {productLines.length === 0 && (
        <motion.div 
          className="mt-4 flex items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-sm text-gray-500">
            Add product lines to help contextualize your research data
          </p>
        </motion.div>
      )}
    </div>
  );
}