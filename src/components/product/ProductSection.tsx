import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, CheckCircle, AlertCircle, X, Save } from 'lucide-react';

interface ProductSectionProps {
  title: string;
  items: string[];
  onUpdate: (items: string[]) => void;
  isExpanded: boolean;
  toggleExpanded: () => void;
  sectionType: 'usps' | 'features' | 'painPoints';
}

export function ProductSection({ 
  title, 
  items, 
  onUpdate, 
  isExpanded, 
  toggleExpanded,
  sectionType 
}: ProductSectionProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedItems, setEditedItems] = React.useState(items);
  const [newItem, setNewItem] = React.useState('');
  
  const getIcon = () => {
    switch (sectionType) {
      case 'usps':
        return <CheckCircle className="text-primary-500 mt-1 mr-2 flex-shrink-0" size={16} />;
      case 'painPoints':
        return <AlertCircle className="text-warning-500 mt-1 mr-2 flex-shrink-0" size={16} />;
      case 'features':
        return <CheckCircle className="text-success-500 mt-1 mr-2 flex-shrink-0" size={16} />;
      default:
        return <CheckCircle className="text-primary-500 mt-1 mr-2 flex-shrink-0" size={16} />;
    }
  };
  
  const getSectionStyle = () => {
    switch (sectionType) {
      case 'usps':
        return 'hover:bg-primary-50/20 border-primary-100';
      case 'painPoints':
        return 'hover:bg-warning-50/20 border-warning-100';
      case 'features':
        return 'hover:bg-success-50/20 border-success-100';
      default:
        return 'hover:bg-primary-50/20 border-primary-100';
    }
  };

  const handleSave = () => {
    onUpdate(editedItems);
    setIsEditing(false);
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      setEditedItems([...editedItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-xl border ${getSectionStyle()} p-4 hover:shadow-md transition-all group`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors mr-1"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={toggleExpanded}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
          >
            {isExpanded ? 
              <ChevronUp className="text-gray-500" /> : 
              <ChevronDown className="text-gray-500" />
            }
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 overflow-hidden"
          >
            {items && items.length > 0 ? (
              items.map((item, i) => (
                <div key={i} className="flex items-start">
                  {getIcon()}
                  <p className="text-gray-700">{item}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No items available</p>
            )}
          </motion.div>
        )}
        
        {isExpanded && isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add new item..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItem.trim()) {
                    handleAddItem();
                  }
                }}
              />
              <button
                onClick={handleAddItem}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {editedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 group/item">
                  <input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...editedItems];
                      newItems[i] = e.target.value;
                      setEditedItems(newItems);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={() => handleRemoveItem(i)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setEditedItems(items);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isExpanded && (
        <div className="mt-1 flex items-center">
          <span className="text-sm text-gray-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
          <button
            onClick={toggleExpanded}
            className="ml-2 text-xs text-primary-600 hover:text-primary-700 flex items-center"
          >
            Show details
          </button>
        </div>
      )}
    </div>
  );
} 