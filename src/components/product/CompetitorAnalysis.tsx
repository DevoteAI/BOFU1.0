import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, FileText, ExternalLink, Plus, X, Edit, Check, ChevronDown, ChevronUp, BarChart, Loader2 } from 'lucide-react';
import { ProductAnalysis, CompetitorItem, CompetitorsData } from '../../types/product/types';
import { CompetitorAnalysisButton } from '../CompetitorAnalysisButton';
import toast from 'react-hot-toast';
import { makeWebhookRequest } from '../../utils/webhookUtils';
import { parseProductData } from '../../types/product';

interface CompetitorAnalysisProps {
  product: ProductAnalysis;
  onUpdate: (url: string) => void;
  onUpdateCompetitors?: (competitors: CompetitorsData) => void;
}

type CompetitorType = 'direct_competitors' | 'niche_competitors' | 'broader_competitors';

export function CompetitorAnalysis({ product, onUpdate, onUpdateCompetitors }: CompetitorAnalysisProps) {
  const [newCompetitor, setNewCompetitor] = useState<{
    type: CompetitorType;
    company_name: string;
    product_name: string;
    category: string;
  }>({
    type: 'direct_competitors',
    company_name: '',
    product_name: '',
    category: ''
  });
  const [showForm, setShowForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<CompetitorType, boolean>>({
    direct_competitors: true,
    niche_competitors: true,
    broader_competitors: true
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Debug: Log the full product object
    console.log("CompetitorAnalysis full product object:", JSON.stringify(product));
    
    // Log the current state of the product and competitors
    console.log("CompetitorAnalysis rendering with product:", product);
    
    if (product.competitors) {
      console.log("Current competitors in product:", product.competitors);
      // Deep-check the structure of competitors arrays
      console.log("Direct competitors is array?", Array.isArray(product.competitors.direct_competitors));
      console.log("Direct competitors length:", product.competitors.direct_competitors?.length);
      console.log("Niche competitors is array?", Array.isArray(product.competitors.niche_competitors));
      console.log("Niche competitors length:", product.competitors.niche_competitors?.length);
      console.log("Broader competitors is array?", Array.isArray(product.competitors.broader_competitors));
      console.log("Broader competitors length:", product.competitors.broader_competitors?.length);
    } else {
      console.log("No competitors in product");
      
      // Check if competitorAnalysisUrl contains JSON with competitor data
      if (product.competitorAnalysisUrl) {
        console.log("Product has competitorAnalysisUrl:", product.competitorAnalysisUrl);
        try {
          const urlData = JSON.parse(product.competitorAnalysisUrl);
          console.log("Parsed competitorAnalysisUrl:", urlData);
          if (urlData.competitors) {
            console.log("Found competitors in URL data:", urlData.competitors);
            
            // Update competitors if needed
            if (!product.competitors && onUpdateCompetitors) {
              const competitors = {
                direct_competitors: Array.isArray(urlData.competitors.direct_competitors) 
                  ? urlData.competitors.direct_competitors : [],
                niche_competitors: Array.isArray(urlData.competitors.niche_competitors) 
                  ? urlData.competitors.niche_competitors : [],
                broader_competitors: Array.isArray(urlData.competitors.broader_competitors) 
                  ? urlData.competitors.broader_competitors : []
              };
              console.log("Updating competitors from URL data:", competitors);
              onUpdateCompetitors(competitors);
            }
          }
        } catch (e) {
          console.log("competitorAnalysisUrl is not valid JSON:", e);
        }
      }
    }
  }, [product, onUpdateCompetitors]);

  const handleAddCompetitor = () => {
    if (!newCompetitor.company_name || !newCompetitor.product_name || !newCompetitor.category) {
      return;
    }

    // Initialize competitors if it doesn't exist
    const updatedCompetitors = product.competitors ? { ...product.competitors } : {
      direct_competitors: [],
      niche_competitors: [],
      broader_competitors: []
    };
    
    // Check if the selected category already has 3 competitors
    if (updatedCompetitors[newCompetitor.type].length >= 3) {
      toast.error(`Maximum limit of 3 ${newCompetitor.type.replace('_', ' ')} reached`);
      return;
    }

    updatedCompetitors[newCompetitor.type] = [
      ...updatedCompetitors[newCompetitor.type],
      {
        company_name: newCompetitor.company_name,
        product_name: newCompetitor.product_name,
        category: newCompetitor.category
      }
    ];

    onUpdateCompetitors?.(updatedCompetitors);
    
    setNewCompetitor({
      type: 'direct_competitors',
      company_name: '',
      product_name: '',
      category: ''
    });
    setShowForm(false);
  };

  const handleRemoveCompetitor = (type: CompetitorType, index: number) => {
    if (!product.competitors) return;
    
    const updatedCompetitors = { ...product.competitors };
    updatedCompetitors[type] = updatedCompetitors[type].filter((_, i) => i !== index);

    onUpdateCompetitors?.(updatedCompetitors);
  };

  const toggleSection = (section: CompetitorType) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUpdateCompetitors = (competitors: any) => {
    console.log("Updating competitors:", competitors);
    if (competitors) {
      // Ensure the structure is as expected and create a completely new object
      // Limit each category to 3 competitors
      const processedCompetitors = {
        direct_competitors: Array.isArray(competitors.direct_competitors) 
          ? [...competitors.direct_competitors].slice(0, 3) : [],
        niche_competitors: Array.isArray(competitors.niche_competitors)
          ? [...competitors.niche_competitors].slice(0, 3) : [],
        broader_competitors: Array.isArray(competitors.broader_competitors)
          ? [...competitors.broader_competitors].slice(0, 3) : []
      };
      console.log("Processed competitors for update:", processedCompetitors);
      onUpdateCompetitors?.(processedCompetitors);
    }
  };

  // Helper function to format Google Doc URL
  const formatGoogleDocUrl = (url: string): string | null => {
    try {
      // Check if it's a Google Docs URL
      if (!url.includes('docs.google.com/document')) {
        return null;
      }
      
      // Extract the document ID
      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return null;
      }
      
      const docId = match[1];
      
      // Format to base URL without any suffix
      const formattedUrl = `https://docs.google.com/document/d/${docId}`;
      
      console.log('Formatted Google Doc URL:', formattedUrl);
      return formattedUrl;
    } catch (e) {
      console.error('Error formatting Google Doc URL:', e);
      return null;
    }
  };

  // Helper function to process URL
  const processUrl = (url: string) => {
    const formattedUrl = formatGoogleDocUrl(url);
    if (formattedUrl) {
      console.log('Formatted Google Doc URL:', formattedUrl);
      onUpdate(formattedUrl);
    } else {
      console.error('Invalid Google Doc URL:', url);
      toast.error('Received invalid Google Doc URL from analysis');
    }
  };

  const handleAnalyzeCompetitors = async () => {
    setIsAnalyzing(true);
    const loadingToast = toast.loading('Analyzing competitors...');

    try {
      // Prepare the data to send to the webhook
      const data = {
        product: {
          companyName: product.companyName,
          productName: product.productDetails?.name,
          description: product.productDetails?.description,
          usps: product.usps,
          businessOverview: product.businessOverview,
          painPoints: product.painPoints,
          features: product.features,
          targetPersona: product.targetPersona,
          pricing: product.pricing,
          currentSolutions: product.currentSolutions,
          capabilities: product.capabilities
        },
        competitors: product.competitors,
        requestType: 'analyze_competitors',
        uniqueId: crypto.randomUUID()
      };

      console.log('Sending competitor analysis request:', data);

      const response = await makeWebhookRequest(
        'https://hook.us2.make.com/qjbyl0g1d1ailgmnn2p9pjmcu888xe43',
        data,
        {
          timeout: 300000, // 5 minutes
          maxRetries: 3,
          retryDelay: 2000
        }
      );

      // Parse the response using our new parser
      const parsedProducts = parseProductData(response);
      
      // If we got any products back, use the first one's data
      if (parsedProducts.length > 0) {
        const firstProduct = parsedProducts[0];
        
        // If the product has a competitor analysis URL, process it
        if (firstProduct.competitorAnalysisUrl) {
          processUrl(firstProduct.competitorAnalysisUrl);
        }
        
        // If the product has competitors data, update it
        if (firstProduct.competitors && onUpdateCompetitors) {
          onUpdateCompetitors(firstProduct.competitors);
        } else {
          // Check raw response for competitors data if not found in parsed product
          checkAndProcessRawResponse(response);
        }
      } else {
        // If no products were parsed, check the raw response
        checkAndProcessRawResponse(response);
      }

      toast.success('Competitor analysis completed', { id: loadingToast });
    } catch (error) {
      console.error('Error in competitor analysis:', error);
      toast.error(`Failed to analyze competitors: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: loadingToast });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Helper function to extract URL and competitors from response
  const checkAndProcessRawResponse = (response: any) => {
    // First check for a URL
    if (typeof response === 'string' && response.includes('docs.google.com')) {
      processUrl(response.trim());
    } else if (typeof response === 'object') {
      const url = response.analysisUrl || response.documentUrl || response.url;
      if (url && typeof url === 'string' && url.includes('docs.google.com')) {
        processUrl(url.trim());
      }
      
      // Check for competitors data in the response
      if (response.competitors && onUpdateCompetitors) {
        console.log("Found competitors data in raw response:", response.competitors);
        onUpdateCompetitors(response.competitors);
      } else if (response.result && typeof response.result === 'object') {
        // Check for competitors in result object
        if (response.result.competitors && onUpdateCompetitors) {
          console.log("Found competitors data in result object:", response.result.competitors);
          onUpdateCompetitors(response.result.competitors);
        }
      } else if (response.result && typeof response.result === 'string') {
        // Try to parse the result string as JSON
        try {
          const resultObj = JSON.parse(response.result);
          if (resultObj.competitors && onUpdateCompetitors) {
            console.log("Found competitors data in parsed result string:", resultObj.competitors);
            onUpdateCompetitors(resultObj.competitors);
          }
        } catch (e) {
          console.warn("Could not parse result string as JSON");
        }
      }
      
      // If no URL was found, throw an error
      if (!url || typeof url !== 'string' || !url.includes('docs.google.com')) {
        throw new Error('No valid analysis URL found in response');
      }
    } else {
      throw new Error('Invalid response format');
    }
  };

  const renderCompetitorSection = (title: string, type: CompetitorType, competitors: CompetitorItem[]) => {
    const isExpanded = expandedSections[type];
    const competitorList = Array.isArray(competitors) ? competitors : [];
    
    console.log(`Rendering ${title} with ${competitorList.length} items:`, competitorList);
    
    return (
      <div className="mb-3">
        <div
          className="flex justify-between items-center p-2 bg-secondary-50 rounded-lg cursor-pointer"
          onClick={() => toggleSection(type)}
        >
          <h4 className="font-medium text-gray-800">{title}</h4>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {competitorList.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {competitorList.map((competitor, index) => (
                    <div 
                      key={`${type}-${index}`}
                      className="p-3 bg-white rounded-lg border border-secondary-100 flex justify-between items-start"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{competitor.company_name}</span>
                          <span className="text-xs px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-full">
                            {competitor.product_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{competitor.category}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCompetitor(type, index);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic mt-2 px-2">
                  No {title.toLowerCase()} identified yet.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div 
      className="bg-secondary-900/80 backdrop-blur-sm rounded-xl border border-primary-500/20 p-4 hover:shadow-glow transition-all"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary-400 flex items-center gap-2">
          <Target className="text-primary-400" size={20} />
          Competitor Analysis
        </h3>
        <CompetitorAnalysisButton 
          product={product} 
          onAnalysisComplete={onUpdate}
          onCompetitorsReceived={handleUpdateCompetitors}
        />
      </div>
      
      {/* Competitors Section */}
      {(product.competitors || true) &&
        <div>
          {/* Manual competitor entry */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 mb-3 px-3 py-1.5 text-xs rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors"
            >
              <Plus size={14} />
              Add Competitor Manually
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-secondary-800 rounded-lg border border-primary-500/20 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-primary-400">Add New Competitor</h4>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-300 rounded-full hover:bg-secondary-700"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Competitor Type</label>
                  <select 
                    value={newCompetitor.type}
                    onChange={(e) => setNewCompetitor({...newCompetitor, type: e.target.value as CompetitorType})}
                    className="w-full px-3 py-1.5 text-sm bg-secondary-900 border border-primary-500/30 text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="direct_competitors">Direct Competitor</option>
                    <option value="niche_competitors">Niche Competitor</option>
                    <option value="broader_competitors">Broader Competitor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category/Segment</label>
                  <input
                    type="text"
                    value={newCompetitor.category}
                    onChange={(e) => setNewCompetitor({...newCompetitor, category: e.target.value})}
                    placeholder="e.g. Enterprise, SMB, Consumer"
                    className="w-full px-3 py-1.5 text-sm bg-secondary-900 border border-primary-500/30 text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={newCompetitor.company_name}
                    onChange={(e) => setNewCompetitor({...newCompetitor, company_name: e.target.value})}
                    placeholder="e.g. Acme Inc."
                    className="w-full px-3 py-1.5 text-sm bg-secondary-900 border border-primary-500/30 text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newCompetitor.product_name}
                    onChange={(e) => setNewCompetitor({...newCompetitor, product_name: e.target.value})}
                    placeholder="e.g. Acme Pro"
                    className="w-full px-3 py-1.5 text-sm bg-secondary-900 border border-primary-500/30 text-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.company_name || !newCompetitor.product_name}
                  className="px-3 py-1.5 text-xs bg-primary-500 text-secondary-900 font-medium rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </motion.div>
          )}

          <div className="bg-secondary-800 rounded-lg border border-primary-500/20 p-3">
            {renderCompetitorSection('Direct Competitors', 'direct_competitors', 
              Array.isArray(product.competitors?.direct_competitors) ? product.competitors.direct_competitors : [])}
            {renderCompetitorSection('Niche Competitors', 'niche_competitors', 
              Array.isArray(product.competitors?.niche_competitors) ? product.competitors.niche_competitors : [])}
            {renderCompetitorSection('Broader Competitors', 'broader_competitors', 
              Array.isArray(product.competitors?.broader_competitors) ? product.competitors.broader_competitors : [])}
            
            {/* Analyze Competitors Button */}
            <div className="mt-4">
              <div className="text-xs text-gray-400 text-center mb-2">
                Click below to perform deep analysis on all identified competitors.
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleAnalyzeCompetitors}
                  disabled={isAnalyzing || 
                    (!product.competitors?.direct_competitors?.length && 
                     !product.competitors?.niche_competitors?.length && 
                     !product.competitors?.broader_competitors?.length)}
                  className="w-full sm:w-auto px-4 py-2 bg-primary-500 text-secondary-900 font-medium rounded-lg hover:bg-primary-400 transition-colors shadow-glow hover:shadow-glow-strong flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 disabled:hover:shadow-none"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart className="w-4 h-4" />
                      Analyze Competitors
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      
      {product.competitorAnalysisUrl && (
        <div className="bg-secondary-800 rounded-lg border border-primary-500/20 p-3 flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-secondary-900 border border-primary-500/20 flex items-center justify-center">
              <FileText size={16} className="text-primary-400" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-primary-400 truncate">
                Competitor Analysis Report
              </p>
              <a
                href={product.competitorAnalysisUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  if (!product.competitorAnalysisUrl) {
                    toast.error('Document URL is missing. Please try generating the report again.');
                    return;
                  }
                  // Check if it's a valid URL
                  try {
                    const url = new URL(product.competitorAnalysisUrl);
                    window.open(url.toString(), '_blank');
                  } catch (err) {
                    console.error('Invalid URL:', err);
                    toast.error('Invalid document URL. Please try generating the report again.');
                  }
                }}
                className="text-xs text-primary-300 hover:text-primary-200 flex items-center w-fit"
              >
                View Report <ExternalLink size={10} className="ml-1" />
              </a>
            </div>
          </div>
        </div>
      )}
      
      {!product.competitors && !product.competitorAnalysisUrl && (
        <p className="text-sm text-gray-400 italic">
          No competitor analysis available yet. Click the button above to generate one.
        </p>
      )}
    </motion.div>
  );
} 