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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm gap-4">
      <div className="w-full md:w-auto">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart2 size={24} className="text-blue-600"/>
          Performance Analytics
        </h1>
   
      </div>

      <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon size={16} className="text-gray-400" />
          </div>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full sm:w-auto pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer appearance-none hover:bg-gray-100 transition-colors"
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
              className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" 
              onChange={(e) => setDateSelection(prev => ({...prev, start: e.target.value}))} 
            />
            <span className="text-gray-400 hidden sm:inline">-</span>
            <input 
              type="date" 
              value={dateSelection.end || ""}
              className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" 
              onChange={(e) => setDateSelection(prev => ({...prev, end: e.target.value}))} 
            />
          </div>
        )}
        
        <button 
          onClick={onApply}
          disabled={isCustomRangeInvalid}
          className={`w-full sm:w-auto px-4 py-2 text-white text-sm font-bold rounded-lg shadow transition-colors ${
            isCustomRangeInvalid
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
