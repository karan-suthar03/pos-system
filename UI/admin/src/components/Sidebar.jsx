import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  UtensilsCrossed,
  Package,
  ChefHat,
  X,
} from "lucide-react";

function SidebarItem({ to, icon: Icon, label, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
        ${isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}
      `}
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <ChefHat className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">RestoAdmin</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4 mt-2">
          Overview
        </div>
        <SidebarItem to="/analytics" icon={TrendingUp} label="Analytics" onNavigate={onNavigate} />

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4 mt-6">
          Management
        </div>
        <SidebarItem to="/orders" icon={ShoppingBag} label="Orders History" onNavigate={onNavigate} />
        <SidebarItem to="/menu" icon={UtensilsCrossed} label="Menu Items" onNavigate={onNavigate} />
        <SidebarItem to="/inventory" icon={Package} label="Inventory" onNavigate={onNavigate} />
      </nav>
    </>
  );
}

export default function Sidebar({ isMobileOpen = false, onMobileClose = () => {} }) {
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed h-full z-20">
        <SidebarContent />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[86vw] bg-white border-r border-gray-200 flex flex-col lg:hidden transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onMobileClose}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <SidebarContent onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
