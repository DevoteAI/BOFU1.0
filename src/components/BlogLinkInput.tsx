import React, { useState } from 'react';
import { Plus, X, Link as LinkIcon, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface BlogLinkInputProps {
  onBlogLinksChange: (links: string[]) => void;
}

export function BlogLinkInput({ onBlogLinksChange }: BlogLinkInputProps) {
  const [blogLinks, setBlogLinks] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const addBlogLink = async () => {
    if (inputValue.trim() === '') return;
    
    setIsValidating(true);
    try {
      if (!validateUrl(inputValue)) {
        toast.error('Please enter a valid URL starting with http:// or https://');
        setIsValidating(false);
        return;
      }
      
      // Check if the URL is already in the list
      if (blogLinks.includes(inputValue.trim())) {
        toast.error('This blog URL has already been added');
        setIsValidating(false);
        return;
      }
      
      const updatedLinks = [...blogLinks, inputValue.trim()];
      setBlogLinks(updatedLinks);
      setInputValue('');
      onBlogLinksChange(updatedLinks);
      toast.success('Blog URL added successfully');
    } catch (error) {
      console.error('Error validating URL:', error);
      toast.error('Error validating URL');
    } finally {
      setIsValidating(false);
    }
  };

  const removeBlogLink = (index: number) => {
    const updatedLinks = blogLinks.filter((_, i) => i !== index);
    setBlogLinks(updatedLinks);
    onBlogLinksChange(updatedLinks);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBlogLink();
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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full space-y-4">
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-medium">Blog Content</h3>
        <p className="text-sm text-neutral-500">
          Add links to blog posts that you want to analyze. We'll extract their content using OpenAI's web search capabilities.
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
            <LinkIcon size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter blog URL (e.g., https://blog.example.com/post)"
            className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            disabled={isValidating}
          />
        </div>
        <motion.button
          onClick={addBlogLink}
          disabled={isValidating || inputValue.trim() === ''}
          className={`flex items-center justify-center h-[42px] px-4 rounded-lg transition-all ${
            isValidating || inputValue.trim() === '' 
              ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' 
              : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
          }`}
          whileHover={!isValidating && inputValue.trim() !== '' ? { scale: 1.03 } : {}}
          whileTap={!isValidating && inputValue.trim() !== '' ? { scale: 0.97 } : {}}
        >
          {isValidating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Plus size={18} className="mr-1" /> Add URL
            </>
          )}
        </motion.button>
      </motion.div>

      {blogLinks.length > 0 && (
        <motion.div 
          className="mt-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <h4 className="text-sm font-medium text-gray-700 mb-2">Added Blog Links</h4>
          <AnimatePresence>
            <div className="space-y-2">
              {blogLinks.map((link, index) => (
                <motion.div
                  key={index}
                  variants={item}
                  exit={{ opacity: 0, x: -100 }}
                  layout
                  className="flex items-center justify-between overflow-hidden bg-secondary-50 border border-secondary-100 p-3 rounded-lg hover:shadow-sm transition-all"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center mr-3 text-secondary-600 flex-shrink-0">
                      <LinkIcon size={16} />
                    </div>
                    <div className="truncate flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{link}</p>
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-secondary-600 hover:text-secondary-800 flex items-center w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open link <ExternalLink size={10} className="ml-1" />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => removeBlogLink(index)}
                    className="ml-2 p-1.5 rounded-lg hover:bg-secondary-200 transition-colors flex-shrink-0"
                    title="Remove blog link"
                  >
                    <X size={16} className="text-secondary-600" />
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}