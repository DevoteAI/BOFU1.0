import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Edit, Eye, Clock, Save, Search, SortAsc, SortDesc, Filter } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ResearchResult } from '../lib/research';
import toast from 'react-hot-toast';
import { EmptyHistoryState } from './EmptyHistoryState';
import { HistorySkeletonLoader } from './SkeletonLoader';

interface ResearchHistoryProps {
  results: ResearchResult[];
  onSelect: (result: ResearchResult) => void;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
  onStartNew?: () => void;
}

export function ResearchHistory({ 
  results, 
  onSelect, 
  onDelete, 
  isLoading = false,
  onStartNew 
}: ResearchHistoryProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick
    
    try {
      await onDelete(id);
      toast.success('Research result deleted successfully');
    } catch (error) {
      toast.error('Failed to delete research result');
    }
  };
  
  const filteredResults = React.useMemo(() => {
    if (!searchTerm.trim()) return results;
    
    const term = searchTerm.toLowerCase().trim();
    return results.filter(result => {
      const companyName = result.data[0]?.companyName || '';
      const productName = result.data[0]?.productDetails?.name || '';
      return companyName.toLowerCase().includes(term) || productName.toLowerCase().includes(term);
    });
  }, [results, searchTerm]);
  
  const sortedResults = React.useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredResults, sortOrder]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-soft p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="text-primary-600" size={20} />
          <h2 className="text-lg font-semibold">Research History</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={sortOrder === 'desc' ? 'Sort Oldest First' : 'Sort Newest First'}
          >
            {sortOrder === 'desc' ? <SortDesc size={18} /> : <SortAsc size={18} />}
          </motion.button>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by company or product name..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <AnimatePresence>
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 mt-4"
          >
            <HistorySkeletonLoader count={5} />
          </motion.div>
        ) : sortedResults.length === 0 && !searchTerm ? (
          onStartNew ? (
            <EmptyHistoryState onStartNew={onStartNew} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-gray-500"
            >
              No research results found
            </motion.div>
          )
        ) : sortedResults.length === 0 && searchTerm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 text-gray-500"
          >
            No results match your search
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {sortedResults.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => onSelect(result)}
                className="group flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 hover:shadow-md transition-all cursor-pointer"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {result.data[0]?.companyName || 'Unknown Company'} - {result.data[0]?.productDetails?.name || 'Unnamed Product'}
                      {result.data.length > 1 && ` (+${result.data.length - 1} more)`}
                    </h3>
                    {result.is_draft && (
                      <span className="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded-full whitespace-nowrap">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 whitespace-nowrap">
                    <Clock size={14} />
                    <span>
                      Created {formatDate(result.created_at)}
                      {result.updated_at !== result.created_at && 
                        ` • Updated ${formatDate(result.updated_at)}`}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>{result.data.length} {result.data.length === 1 ? 'product' : 'products'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(result);
                    }}
                    className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1.5"
                    title="View/Edit Result"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {result.is_draft ? (
                      <>
                        <Edit size={16} />
                        <span className="text-sm">Edit</span>
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        <span className="text-sm">View</span>
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={(e) => handleDelete(result.id, e)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Delete Result"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 size={16} />
                    <span className="text-sm">Delete</span>
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}