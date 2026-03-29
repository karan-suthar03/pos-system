import React from "react";
import { Maximize2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#D97706", "#10B981", "#F59E0B", "#EF4444", "#14B8A6", "#64748B", "#84CC16"];

export default function CategoryPerformanceWidget({ data, onViewAll }) {
  const safeData = Array.isArray(data) ? data : [];
  data = safeData.map(cat => ({
    ...cat,
    psales: cat.sales / 100
  }));
  return (
    <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.3)] flex flex-col">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Category Performance</h3>
   
        </div>
        <button 
          onClick={onViewAll}
          className="text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
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
            <span className="text-xl font-black text-slate-800">{(data || []).length}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-2 w-full overflow-hidden">
          {/* Limit to top 4 for Dashboard view */}
          {(data || []).slice(0, 4).map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-200/60">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                <span className="text-sm font-bold text-slate-700 truncate max-w-[140px] sm:max-w-[110px]">{cat.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">₹{((cat.sales / 100) / 1000).toFixed(1)}k</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
