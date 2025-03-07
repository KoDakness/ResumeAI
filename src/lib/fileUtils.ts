import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js`;

/**
 * Extracts text content from various file types
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  // Handle PDFs
  if (fileType === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  // Handle text files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        reject(new Error('Failed to read file content'));
        return;
      }

      // Basic text cleaning
      const cleanedText = content
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
        .trim();

      resolve(cleanedText);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}