// This file explicitly imports the PDF.js worker and makes it available globally
import * as pdfjsLib from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs';

// Set the worker path explicitly - this is the key fix
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs', 
  import.meta.url
).toString();

console.log('PDF Worker initialized successfully');