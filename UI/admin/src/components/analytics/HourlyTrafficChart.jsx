import React from "react";
import { Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function HourlyTrafficChart({ data }) {
  const hourlyData = data || [];
  const sortedHourly = [...hourlyData].sort((a, b) => b.orders - a.orders);

  const getClampedIndex = (length, percentile) => {
    if (length <= 0) return 0;
    const index = Math.floor((length - 1) * percentile);
    return Math.max(0, Math.min(index, length - 1));
  };
  
  // Calculate thresholds dynamically
  const rushThreshold =
    sortedHourly.length > 0
      ? sortedHourly[getClampedIndex(sortedHourly.length, 0.2)]?.orders || 0
      : 0; // Top 20%
  const slowThreshold =
    sortedHourly.length > 0
      ? sortedHourly[getClampedIndex(sortedHourly.length, 0.8)]?.orders || 0
      : 0; // Bottom 20%

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
          <Clock size={20} className="text-orange-500"/>
          Hourly Traffic
        </h3>
      </div>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: '#f3f4f6' }} />
            <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
              {hourlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.orders >= rushThreshold ? '#F59E0B' : 
                    entry.orders <= slowThreshold ? '#E5E7EB' : '#3B82F6'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
