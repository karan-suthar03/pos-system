import React from "react";
import { Utensils } from "lucide-react";

export default function DishPerformanceTable({ 
  dishData, 
  dishFilter, 
  setDishFilter, 
  onViewAll 
}) {
  return (
    <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.3)] lg:col-span-2 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Utensils size={18} className="text-slate-500"/>
          Dish Performance
        </h3>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/70 shadow-inner">
            {[
              {id: 'revenue', label: 'Rev'}, 
              {id: 'quantity', label: 'Qty'}
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDishFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  dishFilter === tab.id
                  ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button 
            onClick={onViewAll}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            View All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar flex-1 -mx-1 px-1">
        <table className="w-full min-w-[520px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/70 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pl-2">Dish Name</th>
              <th className="pb-3">Category</th>
              <th className="pb-3 text-right">Qty</th>
              <th className="pb-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Limit to top 5 for Widget */}
            {dishData.length > 0 ? dishData.slice(0, 5).map((dish) => (
              <tr key={dish.id} className="group hover:bg-slate-50/60 transition-colors">
                <td className="py-3 pl-2 text-sm font-bold text-slate-800 truncate max-w-[150px]">{dish.name}</td>
                <td className="py-3 text-xs font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">{dish.category}</span>
                </td>
                <td className="py-3 text-sm text-slate-600 text-right">{dish.sales}</td>
                <td className="py-3 text-sm font-bold text-slate-900 text-right">₹{(dish.revenue / 100).toLocaleString()}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="py-8 text-center text-sm text-slate-500">
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
