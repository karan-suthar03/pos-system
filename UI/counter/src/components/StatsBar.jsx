import { CheckCircle2, Clock, IndianRupeeIcon, Plus } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white/60 backdrop-blur-sm p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} transition-colors duration-300`}>
          <Icon size={20} className={`${color} opacity-90`} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

function StatsBar({ stats, onCreateOrder }) {
  return (
    <div className="bg-transparent relative z-30 pt-6 pb-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard label="Active Orders" value={stats.active} icon={Clock} color="text-slate-700" bg="bg-amber-50 group-hover:bg-amber-100" />
          <StatCard label="Closed" value={stats.closed} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50 group-hover:bg-emerald-100" />
          <StatCard
            label="Total Revenue"
            value={`₹${(stats.revenue / 100).toFixed(2)}`}
            icon={IndianRupeeIcon}
            color="text-slate-600"
            bg="bg-slate-100 group-hover:bg-slate-200"
          />
          <button
            onClick={onCreateOrder}
            className="group relative overflow-hidden flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-white rounded-2xl font-semibold shadow-[0_8px_20px_-8px_rgba(15,23,42,0.6)] transition-all duration-300 hover:shadow-[0_12px_28px_-10px_rgba(15,23,42,0.8)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Plus size={20} className="relative z-10 transition-transform group-hover:rotate-90 duration-300" strokeWidth={2.5} />
            <span className="relative z-10 tracking-wide">New Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatsBar;
