import { CheckCircle2, Clock, IndianRupeeIcon, Plus } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
          <p className="text-xl font-black text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </div>
  );
}

function StatsBar({ stats, onCreateOrder }) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Orders" value={stats.active} icon={Clock} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Closed" value={stats.closed} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
          <StatCard
            label="Total Revenue"
            value={`₹${(stats.revenue / 100).toFixed(2)}`}
            icon={IndianRupeeIcon}
            color="text-indigo-600"
            bg="bg-indigo-50"
          />
          <button
            onClick={onCreateOrder}
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all cursor-pointer"
          >
            <Plus size={20} />
            <span>New Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatsBar;
