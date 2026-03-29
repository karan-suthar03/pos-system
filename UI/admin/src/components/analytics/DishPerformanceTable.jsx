import React from "react";
import { Utensils } from "lucide-react";

export default function DishPerformanceTable({ 
  dishData, 
  dishFilter, 
  setDishFilter, 
  onViewAll 
}) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
          <Utensils size={18} className="text-gray-500"/>
          Dish Performance
        </h3>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {[
              {id: 'revenue', label: 'Rev'}, 
              {id: 'quantity', label: 'Qty'}
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDishFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  dishFilter === tab.id
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button 
            onClick={onViewAll}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            View All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 -mx-1 px-1">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="pb-3 pl-2">Dish Name</th>
              <th className="pb-3">Category</th>
              <th className="pb-3 text-right">Qty</th>
              <th className="pb-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* Limit to top 5 for Widget */}
            {dishData.length > 0 ? dishData.slice(0, 5).map((dish) => (
              <tr key={dish.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="py-3 pl-2 text-sm font-bold text-gray-800 truncate max-w-[150px]">{dish.name}</td>
                <td className="py-3 text-xs font-medium text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">{dish.category}</span>
                </td>
                <td className="py-3 text-sm text-gray-600 text-right">{dish.sales}</td>
                <td className="py-3 text-sm font-bold text-gray-900 text-right">₹{(dish.revenue / 100).toLocaleString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="py-8 text-center text-sm text-gray-500">
                  No dish data available for this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
