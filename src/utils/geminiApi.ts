import { encode } from 'base64-arraybuffer';

// API key for Gemini API - in production, this should be stored in environment variables
const API_KEY = 'AIzaSyDGv9wWoMpmzL6wpPmP7va_KJYEe9D8_8s';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ImageProcessingOptions {
  maxSize?: number;
  quality?: number;
  detail?: 'low' | 'high' | 'auto';
}

async function makeRequestWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Check if error is due to model overload
      if (
        response.status === 429 || 
        errorData.error?.message?.includes('overloaded') ||
        errorData.error?.message?.includes('capacity')
      ) {
        if (retries > 0) {
          console.log(`Retrying analysis... ${retries} attempts remaining`);
          await delay(RETRY_DELAY);
          return makeRequestWithRetry(url, options, retries - 1);
        }
      }
      
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.message.includes('overloaded')) {
      console.log(`Retrying after error... ${retries} attempts remaining`);
      await delay(RETRY_DELAY);
      return makeRequestWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

async function processImage(file: File | Blob, options: ImageProcessingOptions = {}): Promise<string> {
  const {
    maxSize = 2048,
    quality = 0.95,
    detail = 'high'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!reader.result) {
          throw new Error('Failed to read file');
        }
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1];
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convert canvas to a data URL and then to a Blob as a fallback method
async function canvasToBlob(canvas: HTMLCanvasElement, mimeType = 'image/jpeg', quality = 0.9): Promise<Blob> {
  try {
    // Try the standard toBlob method first
    const blobFromToBlob = await new Promise<Blob | null>((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              console.warn('Canvas toBlob returned null, falling back to alternative method');
              resolve(null);
            }
          },
          mimeType,
          quality
        );
      } catch (error) {
        console.warn('Canvas toBlob threw an error, falling back to alternative method', error);
        resolve(null);
      }
    });

    if (blobFromToBlob) {
      return blobFromToBlob;
    }

    // Fallback method: convert to dataURL and then to Blob
    console.log('Using fallback method for canvas to blob conversion');
    const dataURL = canvas.toDataURL(mimeType, quality);
    
    // Convert dataURL to Blob
    const byteString = atob(dataURL.split(',')[1]);
    const mimeTypeMatch = dataURL.match(/^data:([^;]+);/);
    const detectedMimeType = mimeTypeMatch ? mimeTypeMatch[1] : mimeType;
    
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([arrayBuffer], { type: detectedMimeType });
  } catch (error) {
    console.error('All canvas to blob conversion methods failed:', error);
    throw new Error(`Failed to convert canvas to blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeImage(imageFile: File | Blob): Promise<string> {
  try {
    // For blobs from PDF pages, we don't check the file type
    if (imageFile instanceof File && !imageFile.type.match(/^image\/(jpeg|png|webp|gif)$/) && !imageFile.type.match(/^application\/pdf$/)) {
      throw new Error('Unsupported file type. Please use JPEG, PNG, WEBP, non-animated GIF, or PDF.');
    }

    const base64Image = await processImage(imageFile);

    console.log('Sending request to Gemini API with image data size:', base64Image.length);

    const response = await makeRequestWithRetry(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + API_KEY,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Extract and output exactly what you see in this image or document. Output the text in a clean format preserving the structure but removing any visual elements.' },
                {
                  inlineData: {
                    mimeType: imageFile instanceof File ? imageFile.type : 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
            stopSequences: []
          }
        })
      }
    );

    const data = await response.json();
    console.log('Gemini API response received');

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error analyzing image:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    if (error instanceof Error) {
      const errorMessage = error.message.includes('overloaded')
        ? 'The service is currently busy. Please try again in a few moments.'
        : `Analysis failed: ${error.message}`;
      throw new Error(errorMessage);
    }
    throw new Error('Failed to analyze image');
  }
}

export async function processScannedPDF(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Define maximum canvas dimension - more conservative than the browser max to ensure compatibility
    const MAX_CANVAS_DIMENSION = 4000; // Some browsers have 8192 or 16384 limit, but use a safer value

    // Convert the first page to an image using PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set the worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';
    
    // Load the PDF document - using a copy of the array buffer to prevent detachment
    const arrayBufferCopy = pdfArrayBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBufferCopy });
    const pdf = await loadingTask.promise;
    
    // Get the total number of pages
    const numPages = pdf.numPages;
    let extractedText = '';
    
    // Process each page (limit to first 5 pages for large PDFs to prevent timeouts)
    const pagesToProcess = Math.min(numPages, 5);
    
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      try {
        // Get the page
        const page = await pdf.getPage(pageNum);
        
        // Initial scale and viewport to determine dimensions
        const initialScale = 1.0;
        const initialViewport = page.getViewport({ scale: initialScale });

        // Calculate the scale needed to fit within MAX_CANVAS_DIMENSION
        let scaleFactor = initialScale;
        
        // Check if we need to scale down to fit within the MAX_CANVAS_DIMENSION
        if (initialViewport.width > MAX_CANVAS_DIMENSION || initialViewport.height > MAX_CANVAS_DIMENSION) {
          const scaleX = MAX_CANVAS_DIMENSION / initialViewport.width;
          const scaleY = MAX_CANVAS_DIMENSION / initialViewport.height;
          
          // Use the smaller scale to ensure both dimensions fit
          scaleFactor = Math.min(scaleX, scaleY);
          
          console.log(`Scaling page ${pageNum} down by factor ${scaleFactor.toFixed(3)} to fit canvas limits`);
        }
        
        // Create a new viewport with the adjusted scale
        const viewport = page.getViewport({ scale: scaleFactor });
        
        // Prepare canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          console.error('Failed to get canvas context for page', pageNum);
          extractedText += `\n--- Page ${pageNum} ---\n[Error: Failed to get canvas context]\n`;
          continue; // Skip this page if we can't get a context
        }
        
        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Log canvas dimensions for debugging
        console.log(`Rendering page ${pageNum} to canvas (${canvas.width}x${canvas.height})`);
        
        // Double-check that our scaling worked
        if (canvas.width <= 0 || canvas.height <= 0 || 
            canvas.width > MAX_CANVAS_DIMENSION || canvas.height > MAX_CANVAS_DIMENSION) {
          console.error(`Invalid canvas dimensions for page ${pageNum} even after scaling: ${canvas.width}x${canvas.height}`);
          extractedText += `\n--- Page ${pageNum} ---\n[Error: Invalid canvas dimensions after scaling]\n`;
          continue;
        }
        
        // Render the page to the canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        try {
          await page.render(renderContext).promise;
          console.log(`Successfully rendered page ${pageNum} to canvas`);
        } catch (renderError) {
          console.error(`Failed to render page ${pageNum} to canvas:`, renderError);
          extractedText += `\n--- Page ${pageNum} ---\n[Error rendering page to canvas]\n`;
          continue;
        }
        
        let blob: Blob;
        try {
          // Use our enhanced canvas to blob conversion
          blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
          console.log(`Successfully converted page ${pageNum} canvas to blob, size: ${blob.size} bytes`);
        } catch (blobError) {
          console.error(`Failed to convert page ${pageNum} canvas to blob:`, blobError);
          extractedText += `\n--- Page ${pageNum} ---\n[Error converting page to image format]\n`;
          continue;
        }
        
        try {
          // Use Gemini API to extract text from the image
          const pageText = await analyzeImage(blob);
          extractedText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          console.log(`Successfully extracted text from page ${pageNum}`);
        } catch (analysisError) {
          console.error(`Failed to analyze page ${pageNum} image:`, analysisError);
          extractedText += `\n--- Page ${pageNum} ---\n[Error analyzing page content]\n`;
        }
        
        // Clean up to free memory
        canvas.remove();
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        extractedText += `\n--- Page ${pageNum} ---\n[Error extracting content from this page]\n`;
      }
    }
    
    if (!extractedText.trim()) {
      return 'No text could be extracted from the PDF. The document may be secured, corrupted, or contain only images without text data.';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error in processScannedPDF:', error);
    throw error;
  }
}