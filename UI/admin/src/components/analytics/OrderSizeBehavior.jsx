import React from "react";

export default function OrderSizeBehavior({ data }) {
  const orderSize = data || [];
  const max = Math.max(...orderSize.map(o => o.count), 1);
  
  return (
    <div className="bg-white/75 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.3)] lg:col-span-1">
      <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight mb-4">Order Size Behavior</h3>
      <div className="space-y-6">
        {orderSize.map((item, idx) => {
          const percent = (item.count / max) * 100;
          
          return (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-slate-600">{item.size}</span>
                <span className="font-bold text-slate-900">{item.count} orders</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200/60">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
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
