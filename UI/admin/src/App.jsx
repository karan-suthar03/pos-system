import { useState } from 'react';
import { Menu, ChefHat } from 'lucide-react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Analytics from './pages/Analytics.jsx';

function App() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50/50 flex font-sans text-slate-900">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 lg:ml-64 min-w-0">
          <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-gray-200 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-md">
                <ChefHat className="text-white" size={18} />
              </div>
              <h1 className="font-bold text-base tracking-tight text-gray-900">RestoAdmin</h1>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
          </header>

          <main className="pt-16 lg:pt-0 min-h-screen">
            <Routes>
              <Route path="/" element={<Navigate to="/analytics" replace />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<Navigate to="/analytics" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
