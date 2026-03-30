import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { getDishPerformance } from "../../API/analytics";

function DetailModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-140 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_28px_70px_-28px_rgba(15,23,42,0.5)] border border-slate-200/70 w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200/70 flex justify-between items-center bg-white/70">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export default function DishModal({ isOpen, onClose, dishFilter, range }) {
    const [dishData, setDishData] = useState([]);
    const [dishFilterState, setDishFilterState] = useState(dishFilter);
    const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

    // Sync state with prop when modal opens
    useEffect(() => {
        if(isOpen) {
            setDishFilterState(dishFilter);
        }
    }, [isOpen, dishFilter]);

    // Fetch data when open, range changes, or local filter changes
    useEffect(() => {
        if (!isOpen) {
          return;
        }

        let isActive = true;
        const requestId = ++requestRef.current;

        setLoading(true);
        async function fetchDishData() {
            try {
                // Fetch top 100 items based on current filter state
                let result = await getDishPerformance(range, dishFilterState, 100);
                if (!isActive || requestId !== requestRef.current) {
                  return;
                }
                setDishData(Array.isArray(result) ? result : []);
            } catch (error) {
                console.error("Failed to fetch dish details", error);
                if (isActive && requestId === requestRef.current) {
                  setDishData([]);
                }
            } finally {
                if (isActive && requestId === requestRef.current) {
                  setLoading(false);
                }
            }
        }
        fetchDishData();

        return () => {
          isActive = false;
        };
    }, [isOpen, range, dishFilterState]);

  return (
    <DetailModal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Dish Performance Details"
    >
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <p className="text-sm text-slate-500">
            Showing top 100 items based on <strong>{dishFilterState}</strong>
        </p>
        <div className="flex bg-slate-100/70 p-1 rounded-xl border border-slate-200/70 shadow-inner w-full sm:w-auto">
            {[
                { id: 'revenue', label: 'By Revenue' },
                { id: 'quantity', label: 'By Quantity' }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setDishFilterState(tab.id)}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${
                        dishFilterState === tab.id
                  ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Table Content */}
        <div className="relative min-h-[18rem]">
          {loading && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-xl">
                  <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
          )}

          <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-xs font-bold text-slate-500 uppercase sticky top-0">
                <th className="p-3 rounded-tl-lg">Dish Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Avg Price</th>
                <th className="p-3 text-right">Qty Sold</th>
                <th className="p-3 text-right rounded-tr-lg">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dishData.length > 0 ? (
                  dishData.map((dish, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm font-bold text-slate-800">{dish.name}</td>
                      <td className="p-3 text-xs text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded">{dish.category}</span>
                      </td>
                      <td className="p-3 text-sm text-slate-500 text-right">
                        {dish.sales > 0 ? `₹${(dish.revenue / dish.sales / 100).toFixed(0)}` : '-'}
                      </td>
                      <td className="p-3 text-sm text-slate-800 text-right font-medium">
                        {dish.sales}
                      </td>
                      <td className="p-3 text-sm font-black text-slate-900 text-right">
                        ₹{(dish.revenue / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                 !loading && (
                    <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                            No data available for this range.
                        </td>
                    </tr>
                 )
              )}
            </tbody>
          </table>
          </div>
      </div>
    </DetailModal>
  );
}