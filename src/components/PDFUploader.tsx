import { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { MenuItem } from '../types';
import { MenuPDFParser } from '../utils/pdfParser';

interface PDFUploaderProps {
  onMenuExtracted: (items: MenuItem[]) => void;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ onMenuExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parser = new MenuPDFParser();
      const menuItems = await parser.extractMenuFromPDF(file);
      
      if (menuItems.length === 0) {
        setError('No menu items found in the PDF. Please ensure the PDF contains a restaurant menu with prices.');
        return;
      }

      onMenuExtracted(menuItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="pdf-upload"
          accept=".pdf"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />
        
        <label htmlFor="pdf-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            {isProcessing ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
            
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isProcessing ? 'Processing PDF...' : 'Upload Restaurant Menu PDF'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isProcessing 
                  ? 'Extracting menu items and prices...' 
                  : 'Drag and drop or click to browse'
                }
              </p>
            </div>
            
            {!isProcessing && (
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <FileText className="h-4 w-4" />
                <span>PDF files only</span>
              </div>
            )}
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Best results with PDFs exported from restaurant websites or digital menus</p>
      </div>
    </div>
  );
};