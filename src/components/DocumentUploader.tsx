import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, File, X, CheckCircle, AlertTriangle, Image, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as PDFJS from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import JSZip from 'jszip';
import { processScannedPDF } from '../utils/geminiApi';

// Import the worker setup file - this ensures the worker is properly initialized
import '../pdf-worker.js';

// Note: We no longer need to set the worker source here, as it's done in the pdf-worker.js file

interface DocumentUploaderProps {
  onDocumentsProcessed: (documents: ProcessedDocument[]) => void;
}

export interface ProcessedDocument {
  name: string;
  type: string;
  content: string;
  status: 'processed' | 'processing' | 'error';
  error?: string;
  isGoogleDoc?: boolean;
  usedAI?: boolean;
}

export function DocumentUploader({ onDocumentsProcessed }: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const extractTextFromPDF = async (file: File): Promise<{ content: string; usedAI: boolean }> => {
    try {
      // Create a copy of the array buffer to prevent detachment issues
      const originalArrayBuffer = await file.arrayBuffer();
      const arrayBufferCopy = originalArrayBuffer.slice(0);
      
      const pdf = await PDFJS.getDocument({ data: arrayBufferCopy }).promise;
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n\n';
      }
      
      // Check if the extraction was successful by evaluating text content
      // This helps detect scanned PDFs or PDFs with embedded images instead of text
      const isEmptyOrMinimal = text.trim().length < 100 || !/[a-zA-Z]/.test(text);
      
      if (isEmptyOrMinimal) {
        console.log('PDF text extraction yielded minimal results, falling back to image-based extraction');
        toast.loading('Using AI to extract text from scanned PDF...', { id: 'ai-extraction' });
        
        // Use a new copy of the array buffer for image processing
        const imageArrayBuffer = originalArrayBuffer.slice(0);
        
        // Fall back to image-based extraction
        const aiExtractedText = await processScannedPDF(imageArrayBuffer);
        toast.success('Successfully extracted text using AI processing', { id: 'ai-extraction' });
        
        return { content: aiExtractedText, usedAI: true };
      }
      
      return { content: text, usedAI: false };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      
      // Try image-based extraction as a fallback
      try {
        toast.loading('Primary extraction failed, using AI to extract text...', { id: 'ai-extraction' });
        // Create a fresh copy of the array buffer for the fallback
        const fallbackArrayBuffer = await file.arrayBuffer();
        const aiExtractedText = await processScannedPDF(fallbackArrayBuffer);
        toast.success('Successfully extracted text using AI processing', { id: 'ai-extraction' });
        
        return { content: aiExtractedText, usedAI: true };
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        throw new Error('Failed to extract text from PDF using both methods');
      }
    }
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX file');
    }
  };

  const extractTextFromDOC = async (file: File): Promise<string> => {
    try {
      // For legacy .doc files, we'll attempt to extract some text
      // but note this is limited as .doc is a binary format
      const text = await file.text();
      // Try to clean up binary content and extract readable text
      let extractedText = '';
      const textChunks = text.split(/[\x00-\x09\x0B\x0C\x0E-\x1F]+/)
        .filter(chunk => chunk.length > 20) // Filter out small chunks that likely aren't text
        .filter(chunk => /[a-zA-Z]/.test(chunk)); // Must have at least one letter
      
      if (textChunks.length > 0) {
        extractedText = textChunks.join('\n\n');
        return extractedText;
      } else {
        throw new Error('Could not extract readable text from DOC file');
      }
    } catch (error) {
      console.error('Error processing DOC file:', error);
      throw new Error('Legacy DOC format is not fully supported. Please convert to DOCX for better results.');
    }
  };

  const extractTextFromPPTX = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // PPTX files store slide content in /ppt/slides/slide*.xml files
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      // Sort the slides by their number
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace('ppt/slides/slide', '').replace('.xml', ''));
        const numB = parseInt(b.replace('ppt/slides/slide', '').replace('.xml', ''));
        return numA - numB;
      });
      
      let text = '';
      
      for (const slideFile of slideFiles) {
        const slideContent = await zip.file(slideFile)?.async('text');
        if (slideContent) {
          // Extract text from XML using regex - not perfect but works for basic extraction
          const slideNumber = slideFile.replace('ppt/slides/slide', '').replace('.xml', '');
          text += `Slide ${slideNumber}:\n`;
          
          // Extract text from <a:t> tags which contain text content
          const textMatches = slideContent.match(/<a:t>([^<]*)<\/a:t>/g);
          if (textMatches) {
            for (const match of textMatches) {
              const content = match.replace(/<a:t>/, '').replace(/<\/a:t>/, '');
              if (content.trim()) {
                text += content.trim() + '\n';
              }
            }
          }
          text += '\n';
        }
      }
      
      return text || 'No text content found in presentation.';
    } catch (error) {
      console.error('Error extracting text from PPTX:', error);
      throw new Error('Failed to extract text from PPTX file');
    }
  };

  const extractGoogleDocsInfo = async (file: File): Promise<{ content: string, isGoogleDoc: boolean }> => {
    try {
      // Read the .gdoc file as text (it's actually JSON)
      const text = await file.text();
      let jsonData;
      
      try {
        jsonData = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid Google Docs file format');
      }
      
      // Extract information from the Google Docs JSON
      const docId = jsonData?.docId || jsonData?.resourceId || 'Unknown';
      const title = jsonData?.title || file.name;
      const url = jsonData?.url || `https://docs.google.com/document/d/${docId}/edit`;
      
      // Return a formatted message with the Google Docs information
      return {
        content: `[Google Docs File Information]\n
Title: ${title}
Document ID: ${docId}
URL: ${url}

NOTE: This is a Google Docs reference file (.gdoc), not the actual document content.
To process this document, please export it from Google Docs as PDF or DOCX format first.`,
        isGoogleDoc: true
      };
    } catch (error) {
      console.error('Error processing Google Docs file:', error);
      throw new Error('Failed to process Google Docs file. Please export it as PDF or DOCX first.');
    }
  };

  const extractTextFromDocument = async (file: File): Promise<{ content: string, isGoogleDoc?: boolean, usedAI?: boolean }> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // Check for Google Docs files by extension
    if (fileName.endsWith('.gdoc')) {
      return await extractGoogleDocsInfo(file);
    }
    
    if (fileType.includes('pdf')) {
      const result = await extractTextFromPDF(file);
      return { content: result.content, usedAI: result.usedAI };
    } else if (fileType.includes('openxmlformats-officedocument.wordprocessingml.document')) {
      // DOCX files
      return { content: await extractTextFromDOCX(file) };
    } else if (fileType.includes('msword')) {
      // Legacy DOC files
      return { content: await extractTextFromDOC(file) };
    } else if (fileType.includes('openxmlformats-officedocument.presentationml.presentation')) {
      // PPTX files
      return { content: await extractTextFromPPTX(file) };
    } else if (fileType.includes('ms-powerpoint')) {
      // Legacy PPT files
      return { 
        content: `Content extraction from legacy PowerPoint (.ppt) files is limited.\n\nPlease convert to PPTX format for better results.`
      };
    } else if (fileType.includes('text') || fileType === 'application/rtf') {
      // Plain text or RTF files
      return { content: await file.text() };
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    const newDocuments: ProcessedDocument[] = [];
    
    for (const file of acceptedFiles) {
      const doc: ProcessedDocument = {
        name: file.name,
        type: file.type,
        content: '',
        status: 'processing'
      };
      
      newDocuments.push(doc);
    }
    
    setDocuments(prev => [...prev, ...newDocuments]);
    
    const processedDocs = [...documents];
    
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const index = documents.length + i;
      
      try {
        const result = await extractTextFromDocument(file);
        
        processedDocs[index] = {
          ...processedDocs[index],
          content: result.content,
          status: 'processed',
          isGoogleDoc: result.isGoogleDoc,
          usedAI: result.usedAI
        };
        
        if (result.isGoogleDoc) {
          toast.success(`Google Docs file information extracted. Note: This is not the full document content.`);
        } else if (result.usedAI) {
          toast.success(`Successfully extracted text from ${file.name} using AI processing`);
        } else {
          toast.success(`Successfully extracted text from ${file.name}`);
        }
        
        setDocuments([...processedDocs]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        processedDocs[index] = {
          ...processedDocs[index],
          status: 'error',
          error: errorMessage
        };
        
        toast.error(`Error processing ${file.name}: ${errorMessage}`);
        setDocuments([...processedDocs]);
      }
    }
    
    setIsProcessing(false);
    onDocumentsProcessed(processedDocs);
  }, [documents, onDocumentsProcessed]);

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
    onDocumentsProcessed(newDocuments);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.google-apps.document': ['.gdoc'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/rtf': ['.rtf']
    },
  });

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
        {...getRootProps()}
        className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-neutral-300 hover:border-primary-400 hover:bg-blue-50'
        }`}
        whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}
        transition={{ duration: 0.3 }}
      >
        <input {...getInputProps()} />
        
        {/* Animated background gradient */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
            isDragActive ? 'opacity-100' : ''
          }`}
        ></div>
        
        <motion.div 
          className="relative z-10 flex flex-col items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className={`mb-4 p-4 rounded-full ${isDragActive ? 'bg-primary-100' : 'bg-blue-50'} group-hover:bg-primary-100 transition-colors duration-300`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Upload 
              className={`transition-colors duration-300 ${isDragActive ? 'text-primary-600' : 'text-primary-400'} group-hover:text-primary-600`} 
              size={36} 
            />
          </motion.div>
          
          <motion.h3 
            className={`text-xl font-medium mb-2 transition-colors duration-300 ${
              isDragActive ? 'text-primary-700' : 'text-gray-800'
            } group-hover:text-primary-700`}
          >
            {isDragActive ? 'Drop files here' : 'Drag & drop your files'}
          </motion.h3>
          
          <motion.p 
            className="text-sm text-neutral-500 max-w-md mb-4 group-hover:text-neutral-600 transition-colors duration-300"
          >
            Supports PDF, Word, PowerPoint, or text files. We'll automatically extract and process the content.
          </motion.p>
          
          <motion.button 
            type="button"
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Browse Files
          </motion.button>
        </motion.div>
      </motion.div>

      {documents.length > 0 && (
        <motion.div 
          className="mt-6 space-y-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Documents</h3>
            {documents.length > 1 && (
              <button 
                onClick={() => {
                  setDocuments([]);
                  onDocumentsProcessed([]);
                }}
                className="text-sm text-red-600 hover:text-red-800 flex items-center"
              >
                <Trash2 size={14} className="mr-1" />
                Remove all
              </button>
            )}
          </div>
          
          <AnimatePresence>
            {documents.map((doc, index) => (
              <motion.div 
                key={index}
                variants={item}
                exit={{ opacity: 0, x: -100 }}
                layout
                className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center mr-3 ${
                    doc.status === 'processed' 
                      ? doc.isGoogleDoc 
                        ? 'bg-warning-100 text-warning-600' 
                        : doc.usedAI 
                          ? 'bg-secondary-100 text-secondary-600' 
                          : 'bg-success-100 text-success-600' 
                      : doc.status === 'error' 
                        ? 'bg-error-100 text-error-600' 
                        : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    <File size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center">
                      {doc.status === 'processing' && (
                        <div className="w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mr-2"></div>
                      )}
                      {doc.status === 'processed' && doc.isGoogleDoc && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                          Google Docs
                        </span>
                      )}
                      {doc.status === 'processed' && doc.usedAI && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                          <Image size={10} className="mr-1" />
                          AI-processed
                        </span>
                      )}
                      {doc.status === 'processed' && !doc.isGoogleDoc && !doc.usedAI && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                          <CheckCircle size={10} className="mr-1" />
                          Processed
                        </span>
                      )}
                      {doc.status === 'error' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                          <AlertTriangle size={10} className="mr-1" />
                          Error
                        </span>
                      )}
                      
                      <span className="text-xs text-gray-500 ml-2 truncate">
                        {doc.status === 'processing' && 'Processing...'}
                        {doc.status === 'error' && doc.error}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeDocument(index)}
                  className="ml-2 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <X size={16} className="text-neutral-500" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}