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
    <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.3)]">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Clock size={20} className="text-amber-500"/>
          Hourly Traffic
        </h3>
      </div>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 28px -18px rgb(15 23 42 / 0.4)', background: 'rgba(255,255,255,0.9)' }} />
            <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
              {hourlyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.orders >= rushThreshold ? '#F59E0B' : 
                    entry.orders <= slowThreshold ? '#E2E8F0' : '#94A3B8'
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
