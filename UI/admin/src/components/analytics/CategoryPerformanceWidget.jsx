import React from "react";
import { Maximize2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6366F1"];

export default function CategoryPerformanceWidget({ data, onViewAll }) {
  const safeData = Array.isArray(data) ? data : [];
  data = safeData.map(cat => ({
    ...cat,
    psales: cat.sales / 100
  }));
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">Category Performance</h3>
   
        </div>
        <button 
          onClick={onViewAll}
          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
        >
          View All <Maximize2 size={14}/>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 flex-1">
        <div className="h-44 w-44 sm:h-52 sm:w-52 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data || []}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="psales"
                nameKey="name"
              >
                {(data || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-gray-800">{(data || []).length}</span>
            <span className="text-xs text-gray-400">Total</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-2 w-full overflow-hidden">
          {/* Limit to top 4 for Dashboard view */}
          {(data || []).slice(0, 4).map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                <span className="text-sm font-bold text-gray-700 truncate max-w-[140px] sm:max-w-[110px]">{cat.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">₹{((cat.sales / 100) / 1000).toFixed(1)}k</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
