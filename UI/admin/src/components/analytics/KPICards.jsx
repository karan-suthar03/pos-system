import React from "react";
import { IndianRupeeIcon, ShoppingBag, TrendingUp, Users } from "lucide-react";

function StatCard({ label, value, subValue, icon: Icon, color, bg }) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-w-0">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
          <Icon size={20} />
        </div>
        {subValue ? (
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
            {subValue}
          </span>
        ) : null}
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 break-all sm:break-normal">{value}</h3>
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function KPICards({ data }) {
  const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

  const totalRevenue = toNumber(data?.totalRevenue);
  const totalOrders = toNumber(data?.totalOrders);
  const averageOrderValue = toNumber(data?.averageOrderValue);
  const avgItemsPerOrder = toNumber(data?.avgItemsPerOrder);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        label="Total Revenue" 
        value={`₹${(totalRevenue / 100).toFixed(2)}`}
        icon={IndianRupeeIcon} 
        bg="bg-green-50" 
        color="text-green-600" 
      />
      <StatCard 
        label="Total Orders" 
        value={`${totalOrders}`} 
        icon={ShoppingBag} 
        bg="bg-blue-50" 
        color="text-blue-600" 
      />
      <StatCard 
        label="Avg Order Value" 
        value={`₹${(averageOrderValue / 100).toFixed(2)}`}
        icon={TrendingUp} 
        bg="bg-purple-50" 
        color="text-purple-600" 
      />
      <StatCard 
        label="Avg Items/Order" 
        value={`${avgItemsPerOrder.toFixed(1)}`}
        icon={Users} 
        bg="bg-orange-50" 
        color="text-orange-600" 
      />
    </div>
  );
}
