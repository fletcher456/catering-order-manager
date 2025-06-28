import React, { useState } from 'react';
import { PDFUploader } from './components/PDFUploader';
import { CateringOrderForm } from './components/CateringOrderForm';
import { OrderSummary } from './components/OrderSummary';
import { MenuItem, CateringOrder, ProcessingMetrics, OptimizationResult } from './types';
import { Brain, FileText, ShoppingCart, BarChart3 } from 'lucide-react';
import './app.css';

type AppState = 'upload' | 'order' | 'summary';

interface AppData {
  menuItems: MenuItem[];
  processingMetrics?: ProcessingMetrics;
  optimizationResult?: OptimizationResult;
  currentOrder?: CateringOrder;
}

function App() {
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [appData, setAppData] = useState<AppData>({ menuItems: [] });

  const handleMenuExtracted = (
    items: MenuItem[], 
    metrics?: ProcessingMetrics, 
    optimization?: OptimizationResult
  ) => {
    setAppData({
      menuItems: items,
      processingMetrics: metrics,
      optimizationResult: optimization
    });
    setCurrentState('order');
  };

  const handleOrderGenerated = (order: CateringOrder) => {
    setAppData(prev => ({ ...prev, currentOrder: order }));
    setCurrentState('summary');
  };

  const handleStartOver = () => {
    setAppData({ menuItems: [] });
    setCurrentState('upload');
  };

  const getStateIcon = (state: AppState) => {
    switch (state) {
      case 'upload': return <FileText className="w-5 h-5" />;
      case 'order': return <ShoppingCart className="w-5 h-5" />;
      case 'summary': return <BarChart3 className="w-5 h-5" />;
    }
  };

  const getStateTitle = (state: AppState) => {
    switch (state) {
      case 'upload': return 'Upload PDF';
      case 'order': return 'Create Order';
      case 'summary': return 'Order Summary';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  AI Catering Order System
                </h1>
                <p className="text-sm text-gray-600">
                  Advanced PDF parsing with Bayesian optimization
                </p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-4">
              {(['upload', 'order', 'summary'] as const).map((state, index) => (
                <div key={state} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    currentState === state 
                      ? 'bg-blue-100 text-blue-700' 
                      : index < (['upload', 'order', 'summary'] as const).indexOf(currentState)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {getStateIcon(state)}
                    <span className="text-sm font-medium">
                      {getStateTitle(state)}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < (['upload', 'order', 'summary'] as const).indexOf(currentState)
                        ? 'bg-green-300'
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8">
        {currentState === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Upload Restaurant Menu PDF
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our advanced AI system uses Bayesian optimization to automatically extract menu items 
                with maximum accuracy. Simply upload your PDF and watch the magic happen.
              </p>
            </div>
            
            <PDFUploader onMenuExtracted={handleMenuExtracted} />
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-blue-600" />
                Advanced AI Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Bayesian Optimization</h4>
                  <p className="text-sm text-gray-600">
                    Automatically tunes 25+ parameters across 4 processing phases for optimal extraction accuracy.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Spatial Clustering</h4>
                  <p className="text-sm text-gray-600">
                    Advanced topological analysis groups text elements into coherent menu item regions.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Heuristic Validation</h4>
                  <p className="text-sm text-gray-600">
                    Multi-layer validation using typography fingerprinting and pattern recognition.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Visual Confirmation</h4>
                  <p className="text-sm text-gray-600">
                    PDF region extraction provides visual validation of identified menu items.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Real-time Progress</h4>
                  <p className="text-sm text-gray-600">
                    Live optimization metrics and processing status with detailed logging.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Smart Categorization</h4>
                  <p className="text-sm text-gray-600">
                    Automatic menu item categorization and serving size estimation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentState === 'order' && appData.menuItems.length > 0 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Create Catering Order
              </h2>
              <p className="text-lg text-gray-600">
                Select quantities for your catering event. The system provides intelligent recommendations 
                based on guest count and menu item categories.
              </p>
            </div>
            
            <CateringOrderForm
              menuItems={appData.menuItems}
              processingMetrics={appData.processingMetrics}
              optimizationResult={appData.optimizationResult}
              onOrderGenerated={handleOrderGenerated}
            />
          </div>
        )}

        {currentState === 'summary' && appData.currentOrder && (
          <div className="space-y-8">
            <OrderSummary
              order={appData.currentOrder}
              onStartOver={handleStartOver}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>
                Powered by advanced AI with Bayesian optimization for maximum accuracy.
                Processes PDFs entirely in the browser - no data uploaded to servers.
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Built with React + TypeScript</span>
              <span>•</span>
              <span>PDF.js for parsing</span>
              <span>•</span>
              <span>Tailwind CSS for styling</span>
            </div>
          </div>
          
          {appData.processingMetrics && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-600">
                    {appData.processingMetrics.itemsExtracted}
                  </div>
                  <div className="text-xs text-gray-500">Items Extracted</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {(appData.processingMetrics.averageConfidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">Avg Confidence</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">
                    {(appData.processingMetrics.processingTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-gray-500">Processing Time</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">
                    {appData.processingMetrics.optimizationIterations}
                  </div>
                  <div className="text-xs text-gray-500">Optimizations</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;