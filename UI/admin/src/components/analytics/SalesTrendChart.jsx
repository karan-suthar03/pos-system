import React, { useMemo } from "react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function SalesTrendChart({ data = [] }) {
  const formattedData = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: '2-digit' 
      }),
      sales: Number((item.sales / 100).toFixed(2))
    }));
  }, [data]);

  const axisTickStyle = { fill: '#9CA3AF', fontSize: 12 };
  
  // Shared X-Axis
  const commonXAxis = (
    <XAxis 
      dataKey="date" 
      axisLine={false} 
      tickLine={false} 
      tick={axisTickStyle} 
      dy={10}
      interval="preserveStartEnd"
      minTickGap={28}
    />
  );

  // Shared Left Y-Axis (Revenue) - Blue Label
  const commonYAxisLeft = (
    <YAxis 
      yAxisId="left" 
      axisLine={false} 
      tickLine={false} 
      tick={axisTickStyle}
      // Added Label Configuration
      label={{ 
        value: 'Revenue (₹)', 
        angle: -90, 
        position: 'insideLeft', 
        style: { fill: '#3B82F6', fontSize: 12, fontWeight: 'bold' } // Blue color
      }}
    />
  );

  // Shared Right Y-Axis (Orders) - Green Label
  const commonYAxisRight = (
    <YAxis 
      yAxisId="right" 
      orientation="right" 
      axisLine={false} 
      tickLine={false} 
      tick={axisTickStyle}
      // Added Label Configuration
      label={{ 
        value: 'Order Volume', 
        angle: 90, 
        position: 'insideRight', 
        style: { fill: '#10B981', fontSize: 12, fontWeight: 'bold' } // Green color
      }}
    />
  );

  const commonTooltip = (
    <Tooltip 
      cursor={{ fill: '#f3f4f6' }}
      formatter={(value, name) => {
        if (name === 'Revenue (₹)') {
          return [
            `₹${Number(value).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            name,
          ];
        }

        return [value, name];
      }}
      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
    />
  );
  
  const commonGrid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />;

  // Margin to prevent labels from being cut off
  const chartMargin = { top: 20, right: 8, left: 0, bottom: 0 };

  const renderChartContent = () => {
    // 1. NO DATA
    if (!formattedData || formattedData.length === 0) {
      return (
        <div className="h-full w-full flex flex-col justify-center items-center text-gray-400">
          <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No sales data available</p>
        </div>
      );
    }

    // 2. SINGLE DATA POINT (Bar Chart)
    if (formattedData.length === 1) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} barSize={60} margin={chartMargin}>
            {commonGrid}
            {commonXAxis}
            {commonYAxisLeft}
            {commonYAxisRight}
            {commonTooltip}
            <Legend />
            <Bar yAxisId="left" dataKey="sales" name="Revenue (₹)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="orders" name="Order Count" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // 3. MULTIPLE DATA POINTS (Composed Chart)
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData} margin={chartMargin}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          {commonGrid}
          {commonXAxis}
          {commonYAxisLeft}
          {commonYAxisRight}
          {commonTooltip}
          <Legend />
          <Area 
            yAxisId="left" 
            type="linear" 
            dataKey="sales" 
            name="Revenue (₹)" 
            stroke="#3B82F6" 
            fillOpacity={1} 
            fill="url(#colorSales)" 
            strokeWidth={3} 
          />
          <Line 
            yAxisId="right" 
            type="linear" 
            dataKey="orders" 
            name="Order Count" 
            stroke="#10B981" 
            strokeWidth={3} 
            dot={{r: 4}} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">Sales & Order Volume Trends</h3>
        
        </div>
      </div>
      <div className="h-64 sm:h-80 w-full">
        {renderChartContent()}
      </div>
    </div>
  );
}