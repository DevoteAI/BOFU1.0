import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RichTextEditor } from './RichTextEditor';
import { Edit2, Save, X, Plus, Trash2, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface Capability {
  title: string;
  description: string;
  content: string;
  images?: string[];
}

interface CapabilityEditorProps {
  capability: Capability;
  onUpdate: (capability: Capability) => void;
  onDelete: () => void;
}

export function CapabilityEditor({ capability, onUpdate, onDelete }: CapabilityEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCapability, setEditedCapability] = useState(capability);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    onUpdate(editedCapability);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div 
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        initial={{ opacity: 0.8, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editedCapability.title}
              onChange={(e) => setEditedCapability({ ...editedCapability, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter capability title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
            <input
              type="text"
              value={editedCapability.description}
              onChange={(e) => setEditedCapability({ ...editedCapability, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter a brief description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Content</label>
            <RichTextEditor
              content={editedCapability.content}
              onChange={(content) => setEditedCapability({ ...editedCapability, content })}
              onImageUpload={handleImageUpload}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => {
              setEditedCapability(capability);
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
    );
  }

  return (
    <motion.div 
      className="group relative bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">
          {capability.title.startsWith('Capability') ? capability.title : `Capability #${capability.title}`}
        </h4>
        
        <div className="relative">
          <p className="text-gray-600">{capability.description}</p>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: capability.content }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={16} /></>
            ) : (
              <>See More <ChevronDown size={16} /></>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}