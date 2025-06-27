import { useState } from 'react';
import { PDFUploader } from './components/PDFUploader';
import { CateringOrderForm } from './components/CateringOrderForm';
import { OrderSummary } from './components/OrderSummary';
import { MenuItem, CateringOrder } from './types';
import { ChefHat } from 'lucide-react';

type AppState = 'upload' | 'order' | 'summary';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('upload');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [finalOrder, setFinalOrder] = useState<CateringOrder | null>(null);

  const handleMenuExtracted = (items: MenuItem[]) => {
    setMenuItems(items);
    setCurrentState('order');
  };

  const handleOrderGenerated = (order: CateringOrder) => {
    setFinalOrder(order);
    setCurrentState('summary');
  };

  const handleStartOver = () => {
    setCurrentState('upload');
    setMenuItems([]);
    setFinalOrder(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catering Order Manager</h1>
              <p className="text-sm text-gray-600">
                Upload restaurant menu PDFs and generate quantity-based catering orders
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                currentState === 'upload' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
              <span className={`text-sm ${
                currentState === 'upload' ? 'text-blue-600 font-medium' : 'text-green-600'
              }`}>
                Upload Menu
              </span>
            </div>

            <div className={`h-px flex-1 ${
              currentState === 'upload' ? 'bg-gray-200' : 'bg-green-300'
            }`} />

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                currentState === 'upload' ? 'bg-gray-300' :
                currentState === 'order' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
              <span className={`text-sm ${
                currentState === 'upload' ? 'text-gray-400' :
                currentState === 'order' ? 'text-blue-600 font-medium' : 'text-green-600'
              }`}>
                Create Order
              </span>
            </div>

            <div className={`h-px flex-1 ${
              currentState === 'summary' ? 'bg-green-300' : 'bg-gray-200'
            }`} />

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                currentState === 'summary' ? 'bg-blue-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm ${
                currentState === 'summary' ? 'text-blue-600 font-medium' : 'text-gray-400'
              }`}>
                Order Summary
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentState === 'upload' && (
          <div className="text-center space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Get Started with Your Catering Order
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload a PDF menu from your favorite restaurant and we'll help you calculate 
                the perfect quantities for your event based on guest count.
              </p>
            </div>
            
            <PDFUploader onMenuExtracted={handleMenuExtracted} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Upload PDF Menu</h3>
                <p className="text-sm text-gray-600">
                  Select a restaurant menu PDF from your device or drag and drop it here
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Set Guest Count</h3>
                <p className="text-sm text-gray-600">
                  Enter your expected number of guests and adjust quantities with sliders
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Generate Order</h3>
                <p className="text-sm text-gray-600">
                  Get a complete catering order with costs and quantities calculated
                </p>
              </div>
            </div>
          </div>
        )}

        {currentState === 'order' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Create Your Catering Order
              </h2>
              <p className="text-lg text-gray-600">
                Found {menuItems.length} menu items. Set your guest count and adjust quantities.
              </p>
            </div>
            
            <CateringOrderForm 
              menuItems={menuItems} 
              onOrderGenerated={handleOrderGenerated}
            />
          </div>
        )}

        {currentState === 'summary' && finalOrder && (
          <div className="space-y-8">
            <OrderSummary 
              order={finalOrder} 
              onStartOver={handleStartOver}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Catering Order Manager - Simplifying event planning one menu at a time</p>
            <p className="mt-1">Works entirely in your browser - no data is sent to external servers</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;