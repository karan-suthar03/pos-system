import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  TrendingUp,
  ShoppingBag,
  UtensilsCrossed,
  Package,
  ChefHat,
  X,
} from "lucide-react";

function SidebarItem({ to, icon, label, onNavigate }) {
  const IconComponent = icon;

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `
        w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-semibold border border-transparent
        ${isActive
          ? "bg-slate-900 text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)]"
          : "text-slate-500 hover:bg-white hover:text-slate-800 hover:border-slate-200"}
      `}
    >
      <IconComponent size={20} />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="p-6 border-b border-slate-200/60 flex items-center gap-3 bg-white/40">
        <div className="bg-amber-600 p-2 rounded-xl shadow-[0_8px_18px_-10px_rgba(217,119,6,0.75)]">
          <ChefHat className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">RestoAdmin</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1">Operations Console</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-2 px-4 mt-2">
          Overview
        </div>
        <SidebarItem to="/analytics" icon={TrendingUp} label="Analytics" onNavigate={onNavigate} />

        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-2 px-4 mt-6">
          Management
        </div>
        <SidebarItem to="/orders" icon={ShoppingBag} label="Orders History" onNavigate={onNavigate} />
        <SidebarItem to="/menu" icon={UtensilsCrossed} label="Menu Items" onNavigate={onNavigate} />
        <SidebarItem to="/inventory" icon={Package} label="Inventory" onNavigate={onNavigate} />
        <SidebarItem to="/inventory/movements" icon={Activity} label="Movements" onNavigate={onNavigate} />
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
      <aside className="w-64 bg-white/72 backdrop-blur-xl border-r border-slate-200/60 hidden lg:flex flex-col fixed h-full z-20 shadow-[0_10px_35px_-25px_rgba(15,23,42,0.45)]">
        <SidebarContent />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onMobileClose}
      />

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[86vw] bg-white/90 backdrop-blur-xl border-r border-slate-200/70 shadow-[0_24px_50px_-22px_rgba(15,23,42,0.55)] flex flex-col lg:hidden transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/60">
          <button
            type="button"
            onClick={onMobileClose}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
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
