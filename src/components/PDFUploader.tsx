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
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLogs([]);
    addLog('Starting PDF upload process...');

    try {
      const parser = new MenuPDFParser();
      parser.setLogCallback(addLog);
      const menuItems = await parser.extractMenuFromPDF(file);
      
      if (menuItems.length === 0) {
        addLog('No menu items found in PDF');
        setError('No menu items found in the PDF. Please ensure the PDF contains a restaurant menu with prices.');
        return;
      }

      addLog(`Successfully extracted ${menuItems.length} menu items!`);
      onMenuExtracted(menuItems);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process PDF';
      addLog(`ERROR: ${errorMsg}`);
      setError(errorMsg);
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

      {/* Real-time Processing Logs */}
      {logs.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Processing Log:</h4>
          <div className="max-h-40 overflow-y-auto text-xs font-mono">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-600 mb-1">
                {log}
              </div>
            ))}
          </div>
          {isProcessing && (
            <div className="mt-2 text-xs text-blue-600">
              Processing... Check logs above for current status
            </div>
          )}
        </div>
      )}

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
        <p className="mt-1">Processing logs will appear above to help debug any issues</p>
      </div>
    </div>
  );
};