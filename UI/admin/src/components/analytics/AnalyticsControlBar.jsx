import React from "react";
import { Calendar as CalendarIcon, BarChart2 } from "lucide-react";

export default function AnalyticsControlBar({ 
  dateRange, 
  setDateRange, 
  dateSelection, 
  setDateSelection, 
  onApply 
}) {
  const isCustomRangeInvalid =
    dateRange === "Custom Range" && (!dateSelection.start || !dateSelection.end);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/75 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.35)] gap-4">
      <div className="w-full md:w-auto">
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
          <BarChart2 size={24} className="text-amber-600"/>
          Performance Analytics
        </h1>
   
      </div>

      <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon size={16} className="text-slate-400" />
          </div>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-white/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-300 outline-none cursor-pointer appearance-none hover:bg-white transition-colors"
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Custom Range</option>
          </select>
        </div>
        
        {dateRange === "Custom Range" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 animate-fade-in w-full sm:w-auto">
            <input 
              type="date" 
              value={dateSelection.start || ""}
              className="w-full sm:w-auto px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-300 outline-none" 
              onChange={(e) => setDateSelection(prev => ({...prev, start: e.target.value}))} 
            />
            <span className="text-slate-400 hidden sm:inline">-</span>
            <input 
              type="date" 
              value={dateSelection.end || ""}
              className="w-full sm:w-auto px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-300 outline-none" 
              onChange={(e) => setDateSelection(prev => ({...prev, end: e.target.value}))} 
            />
          </div>
        )}
        
        <button 
          onClick={onApply}
          disabled={isCustomRangeInvalid}
          className={`w-full sm:w-auto px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow transition-colors ${
            isCustomRangeInvalid
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800 cursor-pointer"
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
