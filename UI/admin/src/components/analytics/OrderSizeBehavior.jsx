import React from "react";

export default function OrderSizeBehavior({ data }) {
  const orderSize = data || [];
  const max = Math.max(...orderSize.map(o => o.count), 1);
  
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-1">
      <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Order Size Behavior</h3>
      <div className="space-y-6">
        {orderSize.map((item, idx) => {
          const percent = (item.count / max) * 100;
          
          return (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-600">{item.size}</span>
                <span className="font-bold text-gray-900">{item.count} orders</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{width: `${percent}%`}}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
