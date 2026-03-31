import { useState } from 'react';
import { Menu as MenuItem, ChefHat } from 'lucide-react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Analytics from './pages/Analytics.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import Menu from './pages/Menu.jsx';
import MenuItemPage from './pages/MenuItemPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import AddInventoryItemPage from './pages/AddInventoryItemPage.jsx';
import InventoryItemDetailPage from './pages/InventoryItemDetailPage.jsx';
import InventoryMovementsPage from './pages/InventoryMovementsPage.jsx';

function App() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="relative min-h-screen bg-slate-50/30 flex font-sans text-slate-900 selection:bg-amber-100">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[12%] -left-[12%] w-[42%] h-[42%] bg-amber-50/80 rounded-full blur-[130px]" />
          <div className="absolute -bottom-[12%] -right-[10%] w-[40%] h-[40%] bg-emerald-50/80 rounded-full blur-[120px]" />
        </div>

        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 lg:ml-64 min-w-0">
          <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-16 bg-white/75 backdrop-blur-xl border-b border-slate-200/60 px-4 flex items-center justify-between shadow-[0_6px_20px_-16px_rgba(15,23,42,0.3)]">
            <div className="flex items-center gap-2">
              <div className="bg-amber-600 p-1.5 rounded-md shadow-[0_8px_16px_-8px_rgba(217,119,6,0.7)]">
                <ChefHat className="text-white" size={18} />
              </div>
              <h1 className="font-bold text-base tracking-tight text-slate-800">RestoAdmin</h1>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Open sidebar"
            >
              <MenuItem size={20} />
            </button>
          </header>

          <main className="pt-16 lg:pt-0 min-h-screen">
            <Routes>
              <Route path="/" element={<Navigate to="/analytics" replace />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:orderId" element={<OrderDetailPage />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/menu/item/:id" element={<MenuItemPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/movements" element={<InventoryMovementsPage />} />
              <Route path="/inventory/add" element={<AddInventoryItemPage />} />
              <Route path="/inventory/:id" element={<InventoryItemDetailPage />} />
              <Route path="*" element={<Navigate to="/analytics" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
