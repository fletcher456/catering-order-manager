import React from 'react';
import { ShoppingCart, Users, DollarSign, Download, Printer, Mail, Brain, BarChart3, Clock, Target } from 'lucide-react';
import { CateringOrder } from '../types';

interface OrderSummaryProps {
  order: CateringOrder;
  onStartOver: () => void;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ order, onStartOver }) => {
  const handleDownload = () => {
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Catering Order</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin: 20px 0; }
              .item { margin: 10px 0; display: flex; justify-content: space-between; }
              .total { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
            </style>
          </head>
          <body>
            ${generateOrderHTML()}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleEmail = () => {
    const orderText = generateOrderText();
    const subject = encodeURIComponent('Catering Order Request');
    const body = encodeURIComponent(orderText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const generateOrderText = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let text = `CATERING ORDER\n`;
    text += `Generated on ${date} at ${time}\n\n`;
    text += `Guest Count: ${order.guestCount}\n`;
    text += `Total Cost: $${order.totalCost.toFixed(2)}\n`;
    text += `Cost per Guest: $${(order.totalCost / order.guestCount).toFixed(2)}\n\n`;
    
    // Group by category
    const groupedItems = order.items.reduce((groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
      return groups;
    }, {} as Record<string, typeof order.items>);

    Object.entries(groupedItems).forEach(([category, items]) => {
      text += `${category.toUpperCase()}\n`;
      text += `${'='.repeat(category.length + 10)}\n`;
      items.forEach(item => {
        text += `${item.quantity}x ${item.name} @ $${item.price.toFixed(2)} = $${item.totalPrice.toFixed(2)}\n`;
        if (item.description) {
          text += `    ${item.description}\n`;
        }
      });
      text += '\n';
    });

    if (order.processingMetrics) {
      text += `\nPROCESSING DETAILS\n`;
      text += `==================\n`;
      text += `Items Extracted: ${order.processingMetrics.itemsExtracted}\n`;
      text += `Average Confidence: ${(order.processingMetrics.averageConfidence * 100).toFixed(1)}%\n`;
      text += `Processing Time: ${(order.processingMetrics.processingTime / 1000).toFixed(1)} seconds\n`;
      text += `Optimization Iterations: ${order.processingMetrics.optimizationIterations}\n`;
    }

    return text;
  };

  const generateOrderHTML = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    // Group by category
    const groupedItems = order.items.reduce((groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
      return groups;
    }, {} as Record<string, typeof order.items>);

    let html = `
      <div class="header">
        <h1>Catering Order</h1>
        <p>Generated on ${date} at ${time}</p>
      </div>
      
      <div class="section">
        <h2>Order Summary</h2>
        <p><strong>Guest Count:</strong> ${order.guestCount}</p>
        <p><strong>Total Items:</strong> ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
      </div>
    `;

    Object.entries(groupedItems).forEach(([category, items]) => {
      html += `
        <div class="section">
          <h3>${category}</h3>
      `;
      items.forEach(item => {
        html += `
          <div class="item">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${item.totalPrice.toFixed(2)}</span>
          </div>
        `;
        if (item.description) {
          html += `<div style="margin-left: 20px; color: #666; font-size: 0.9em;">${item.description}</div>`;
        }
      });
      html += `</div>`;
    });

    html += `
      <div class="section total">
        <div class="item">
          <span><strong>Total Cost:</strong></span>
          <span><strong>$${order.totalCost.toFixed(2)}</strong></span>
        </div>
        <div class="item">
          <span><strong>Cost per Guest:</strong></span>
          <span><strong>$${(order.totalCost / order.guestCount).toFixed(2)}</strong></span>
        </div>
      </div>
    `;

    return html;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Catering Order Complete</h2>
        <p className="text-gray-600">Your order has been generated and is ready for export</p>
      </div>

      {/* Processing Results */}
      {(order.processingMetrics || order.optimizationResult) && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center mb-4">
            <Brain className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">AI Processing Summary</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {order.processingMetrics && (
              <>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {order.processingMetrics.itemsExtracted}
                  </div>
                  <div className="text-sm text-gray-600">Items Found</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(order.processingMetrics.averageConfidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {(order.processingMetrics.processingTime / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600">Process Time</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {order.processingMetrics.optimizationIterations}
                  </div>
                  <div className="text-sm text-gray-600">Optimizations</div>
                </div>
              </>
            )}
          </div>

          {order.optimizationResult && (
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Bayesian Optimization Results
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {order.optimizationResult.performance.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-600">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {(order.optimizationResult.objectiveBreakdown.accuracy * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">
                    {(order.optimizationResult.objectiveBreakdown.speed * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Speed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {order.optimizationResult.convergenceMetrics.iterations}
                  </div>
                  <div className="text-xs text-gray-600">Iterations</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Order Details</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {order.guestCount} guests
            </div>
            <div className="flex items-center">
              <ShoppingCart className="w-4 h-4 mr-1" />
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
            </div>
          </div>
        </div>

        {/* Items by Category */}
        <div className="space-y-6">
          {Object.entries(
            order.items.reduce((groups, item) => {
              if (!groups[item.category]) {
                groups[item.category] = [];
              }
              groups[item.category].push(item);
              return groups;
            }, {} as Record<string, typeof order.items>)
          ).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                {category}
              </h4>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{item.quantity}x</span>
                        <span className="text-gray-900">{item.name}</span>
                        <span className="text-sm text-gray-500">@ ${item.price.toFixed(2)}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 ml-8">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 mt-6 pt-6">
          <div className="flex items-center justify-between text-xl font-bold">
            <span>Total Cost:</span>
            <span className="text-green-600">${order.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
            <span>Cost per guest:</span>
            <span>${(order.totalCost / order.guestCount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5 mr-2" />
          Download
        </button>
        
        <button
          onClick={handlePrint}
          className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print
        </button>
        
        <button
          onClick={handleEmail}
          className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Mail className="w-5 h-5 mr-2" />
          Email
        </button>
        
        <button
          onClick={onStartOver}
          className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          New Order
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-4">
        <p>Order generated using advanced AI with Bayesian optimization for maximum accuracy</p>
        <p className="mt-1">
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};