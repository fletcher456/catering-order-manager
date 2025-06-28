import React, { useState } from 'react';
import { Users, Plus, Minus, ShoppingCart, Star, Brain, TrendingUp, Zap, Target, BarChart3, Clock } from 'lucide-react';
import { MenuItem, CateringOrder, OrderItem, ProcessingMetrics, OptimizationResult } from '../types';

interface CateringOrderFormProps {
  menuItems: MenuItem[];
  processingMetrics?: ProcessingMetrics;
  optimizationResult?: OptimizationResult;
  onOrderGenerated: (order: CateringOrder) => void;
}

export const CateringOrderForm: React.FC<CateringOrderFormProps> = ({ 
  menuItems, 
  processingMetrics, 
  optimizationResult, 
  onOrderGenerated 
}) => {
  const [guestCount, setGuestCount] = useState<number>(10);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Group menu items by category
  const groupedItems = menuItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>);

  const calculateRecommendedQuantity = (item: MenuItem): number => {
    const servingSize = item.servingSize || 2;
    const baseQuantity = Math.ceil(guestCount / servingSize);
    
    // Adjust based on category
    switch (item.category.toLowerCase()) {
      case 'appetizers':
        return Math.ceil(baseQuantity * 0.8);
      case 'entrees':
      case 'mains':
        return baseQuantity;
      case 'sides':
        return Math.ceil(baseQuantity * 0.6);
      case 'desserts':
        return Math.ceil(baseQuantity * 0.7);
      case 'beverages':
        return Math.ceil(guestCount * 1.2);
      default:
        return baseQuantity;
    }
  };

  const updateQuantity = (itemId: string, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }));
  };

  const setRecommendedQuantity = (itemId: string, recommended: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: recommended
    }));
  };

  const generateOrder = () => {
    const orderItems: OrderItem[] = menuItems
      .filter(item => quantities[item.id] > 0)
      .map(item => ({
        ...item,
        quantity: quantities[item.id],
        totalPrice: item.price * quantities[item.id]
      }));

    const totalCost = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const order: CateringOrder = {
      guestCount,
      items: orderItems,
      totalCost,
      processingMetrics,
      optimizationResult
    };

    onOrderGenerated(order);
  };

  const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const totalCost = menuItems.reduce((sum, item) => {
    const qty = quantities[item.id] || 0;
    return sum + (item.price * qty);
  }, 0);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'appetizers': return <Target className="w-5 h-5" />;
      case 'entrees':
      case 'mains': return <Star className="w-5 h-5" />;
      case 'sides': return <BarChart3 className="w-5 h-5" />;
      case 'desserts': return <TrendingUp className="w-5 h-5" />;
      case 'beverages': return <Zap className="w-5 h-5" />;
      default: return <ShoppingCart className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Processing Results Summary */}
      {(processingMetrics || optimizationResult) && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <Brain className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Processing Results</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {processingMetrics && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {processingMetrics.itemsExtracted}
                  </div>
                  <div className="text-sm text-gray-600">Items Extracted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(processingMetrics.averageConfidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(processingMetrics.processingTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {processingMetrics.optimizationIterations}
                  </div>
                  <div className="text-sm text-gray-600">Optimizations</div>
                </div>
              </>
            )}
          </div>

          {optimizationResult && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">Optimization Results</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Performance:</span>
                  <span className="ml-2 font-mono text-blue-600">
                    {optimizationResult.performance.toFixed(3)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Iterations:</span>
                  <span className="ml-2 font-mono text-purple-600">
                    {optimizationResult.convergenceMetrics.iterations}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Accuracy:</span>
                  <span className="ml-2 font-mono text-green-600">
                    {(optimizationResult.objectiveBreakdown.accuracy * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Speed:</span>
                  <span className="ml-2 font-mono text-orange-600">
                    {(optimizationResult.objectiveBreakdown.speed * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guest Count Input */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Guest Count</h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setGuestCount(Math.max(1, guestCount - 5))}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>
          
          <input
            type="number"
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 text-center text-xl font-semibold border border-gray-300 rounded-md px-3 py-2"
            min="1"
          />
          
          <button
            onClick={() => setGuestCount(guestCount + 5)}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <span className="text-gray-600">guests</span>
        </div>
      </div>

      {/* Menu Items by Category */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              {getCategoryIcon(category)}
              <h3 className="text-lg font-semibold text-gray-900 ml-3">{category}</h3>
              <span className="ml-auto text-sm text-gray-500">{items.length} items</span>
            </div>
            
            <div className="grid gap-4">
              {items.map((item) => {
                const recommended = calculateRecommendedQuantity(item);
                const currentQuantity = quantities[item.id] || 0;
                const itemTotal = item.price * currentQuantity;
                
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <span className="text-lg font-semibold text-green-600">
                            ${item.price.toFixed(2)}
                          </span>
                          {item.confidence && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm text-gray-500">
                                {(item.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Serves {item.servingSize || 2}</span>
                          <span>Recommended: {recommended}</span>
                          {item.regionImage && (
                            <div className="flex items-center space-x-1">
                              <div className="w-8 h-5 bg-gray-200 rounded border overflow-hidden">
                                <img 
                                  src={item.regionImage} 
                                  alt="PDF region" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span>PDF excerpt</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        <button
                          onClick={() => setRecommendedQuantity(item.id, recommended)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Use Rec.
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                            disabled={currentQuantity === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <span className="w-12 text-center font-medium">
                            {currentQuantity}
                          </span>
                          
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {itemTotal > 0 && (
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              ${itemTotal.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      {totalItems > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
            <div className="text-right">
              <div className="text-sm text-gray-600">{totalItems} items selected</div>
              <div className="text-sm text-gray-600">For {guestCount} guests</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                ${(totalCost / guestCount).toFixed(2)} per guest
              </div>
            </div>
            
            <button
              onClick={generateOrder}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Generate Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};