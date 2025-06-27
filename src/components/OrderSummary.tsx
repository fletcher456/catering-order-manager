import { FC } from 'react';
import { Download, Printer, Mail, Users, DollarSign } from 'lucide-react';
import { CateringOrder } from '../types';

interface OrderSummaryProps {
  order: CateringOrder;
  onStartOver: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ order, onStartOver }) => {
  const generateOrderText = (): string => {
    const timestamp = new Date().toLocaleDateString();
    let orderText = `CATERING ORDER SUMMARY\n`;
    orderText += `Generated: ${timestamp}\n`;
    orderText += `Guest Count: ${order.guestCount}\n`;
    orderText += `Cost per Guest: $${(order.totalCost / order.guestCount).toFixed(2)}\n\n`;
    
    // Group items by category
    const itemsByCategory = order.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof order.items>);
    
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      orderText += `${category.toUpperCase()}\n`;
      orderText += `${'='.repeat(category.length + 10)}\n`;
      
      items.forEach(item => {
        orderText += `${item.quantity}x ${item.name}`;
        if (item.description) {
          orderText += ` - ${item.description}`;
        }
        orderText += `\n   $${item.price.toFixed(2)} each = $${item.totalPrice.toFixed(2)}\n`;
      });
      orderText += '\n';
    });
    
    orderText += `TOTAL COST: $${order.totalCost.toFixed(2)}\n`;
    return orderText;
  };

  const downloadOrder = () => {
    const orderText = generateOrderText();
    const blob = new Blob([orderText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catering-order-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printOrder = () => {
    const orderText = generateOrderText();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Catering Order</title>
            <style>
              body { font-family: monospace; white-space: pre-wrap; margin: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${orderText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const shareByEmail = () => {
    const orderText = generateOrderText();
    const subject = encodeURIComponent('Catering Order Summary');
    const body = encodeURIComponent(orderText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-green-800">Order Generated Successfully!</h2>
        </div>
        <p className="text-green-700">
          Your catering order has been calculated based on {order.guestCount} guests
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-800">{order.guestCount}</div>
          <div className="text-sm text-gray-600">Guests</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-2xl font-bold text-gray-800">{order.items.length}</div>
          <div className="text-sm text-gray-600">Menu Items</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">
            ${(order.totalCost / order.guestCount).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Per Guest</div>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">Order Details</h3>
        </div>
        
        <div className="p-6 space-y-6">
          {Object.entries(
            order.items.reduce((acc, item) => {
              if (!acc[item.category]) {
                acc[item.category] = [];
              }
              acc[item.category].push(item);
              return acc;
            }, {} as Record<string, typeof order.items>)
          ).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-medium text-gray-800 mb-3 text-lg">{category}</h4>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {item.quantity}x {item.name}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        ${item.price.toFixed(2)} each
                        {item.servingSize && item.servingSize > 1 && (
                          <span> • Serves {item.servingSize}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        ${item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold text-gray-800">Total Cost:</span>
            <span className="text-2xl font-bold text-green-600">
              ${order.totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={downloadOrder}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Download className="h-5 w-5" />
          <span>Download Order</span>
        </button>
        
        <button
          onClick={printOrder}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          <Printer className="h-5 w-5" />
          <span>Print Order</span>
        </button>
        
        <button
          onClick={shareByEmail}
          className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
        >
          <Mail className="h-5 w-5" />
          <span>Email Order</span>
        </button>
        
        <button
          onClick={onStartOver}
          className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          <span>Create New Order</span>
        </button>
      </div>
    </div>
  );
};