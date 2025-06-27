import { useState, useMemo } from 'react';
import { Users, ShoppingCart, DollarSign } from 'lucide-react';
import { MenuItem, CateringOrder, OrderItem } from '../types';

interface CateringOrderFormProps {
  menuItems: MenuItem[];
  onOrderGenerated: (order: CateringOrder) => void;
}

export const CateringOrderForm: React.FC<CateringOrderFormProps> = ({ 
  menuItems, 
  onOrderGenerated 
}) => {
  const [guestCount, setGuestCount] = useState(10);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const groupedItems = useMemo(() => {
    return menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  const calculateRecommendedQuantity = (item: MenuItem): number => {
    const servingSize = item.servingSize || 1;
    const baseQuantity = Math.ceil(guestCount / servingSize);
    
    // Adjust based on category (appetizers need more per person)
    if (item.category.toLowerCase().includes('appetizer') || item.category.toLowerCase().includes('starter')) {
      return Math.ceil(baseQuantity * 1.5);
    }
    
    // Desserts typically need fewer
    if (item.category.toLowerCase().includes('dessert')) {
      return Math.ceil(baseQuantity * 0.8);
    }
    
    return baseQuantity;
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, newQuantity)
    }));
  };

  const orderItems = useMemo(() => {
    return menuItems
      .map(item => {
        const quantity = quantities[item.id] || 0;
        if (quantity === 0) return null;
        
        return {
          ...item,
          quantity,
          totalPrice: item.price * quantity
        };
      })
      .filter((item): item is OrderItem => item !== null);
  }, [menuItems, quantities]);

  const totalCost = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [orderItems]);

  const handleGenerateOrder = () => {
    const order: CateringOrder = {
      guestCount,
      items: orderItems,
      totalCost
    };
    onOrderGenerated(order);
  };

  const autoFillRecommended = () => {
    const recommendedQuantities: Record<string, number> = {};
    menuItems.forEach(item => {
      recommendedQuantities[item.id] = calculateRecommendedQuantity(item);
    });
    setQuantities(recommendedQuantities);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Guest Count Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-800">Guest Count</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <label htmlFor="guest-count" className="text-sm font-medium text-gray-700">
            Number of Guests:
          </label>
          <input
            id="guest-count"
            type="number"
            min="1"
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={autoFillRecommended}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            Auto-fill Recommended
          </button>
        </div>
      </div>

      {/* Menu Items by Category */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{category}</h3>
            
            <div className="grid gap-4">
              {items.map(item => {
                const currentQuantity = quantities[item.id] || 0;
                const recommendedQuantity = calculateRecommendedQuantity(item);
                const itemTotal = item.price * currentQuantity;
                
                return (
                  <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-md">
                    {/* PDF Region Image */}
                    {item.regionImage && (
                      <div className="flex-shrink-0">
                        <div className="w-32 h-20 border border-gray-300 rounded overflow-hidden bg-white">
                          <img 
                            src={item.regionImage} 
                            alt={`PDF region for ${item.name}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {item.confidence && (
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            {Math.round(item.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>${item.price.toFixed(2)} each</span>
                          {item.servingSize && item.servingSize > 1 && (
                            <span>Serves {item.servingSize}</span>
                          )}
                          <span className="text-blue-600">
                            Suggested: {recommendedQuantity}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, currentQuantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-md text-gray-600"
                            disabled={currentQuantity === 0}
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            value={currentQuantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          
                          <button
                            onClick={() => handleQuantityChange(item.id, currentQuantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-md text-gray-600"
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="w-20 text-right">
                          <span className="font-medium text-gray-800">
                            ${itemTotal.toFixed(2)}
                          </span>
                        </div>
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
      {orderItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ShoppingCart className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800">Order Summary</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} (×{item.quantity})</span>
                <span>${item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">Total Cost:</span>
              <span className="text-2xl font-bold text-green-600">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
              <span>Cost per guest:</span>
              <span>${(totalCost / guestCount).toFixed(2)}</span>
            </div>
            
            <button
              onClick={handleGenerateOrder}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <DollarSign className="h-5 w-5" />
              <span>Generate Order Summary</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};