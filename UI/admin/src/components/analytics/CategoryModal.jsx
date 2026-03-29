import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getCategoryPerformance } from "../../API/analytics";
function DetailModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm animate-fade-in">
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
}

export default function CategoryModal({ isOpen, onClose, range }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
          return;
        }

        let isActive = true;
        setLoading(true);
        setData([]);

        (async () => {
            try {
                const response = await getCategoryPerformance(range);
                if (isActive) {
                  setData(Array.isArray(response) ? response : []);
                }
            } catch (error) {
                console.error("Failed to fetch category details", error);
                if (isActive) {
                  setData([]);
                }
            } finally {
                if (isActive) {
                  setLoading(false);
                }
            }
        })();

        return () => {
          isActive = false;
        };
    }, [isOpen, range]);

  return (
    <DetailModal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Full Category Breakdown"
    >
      <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[520px] text-left border-collapse">
        <thead>
          <tr className="bg-slate-100/70 text-xs font-bold text-slate-500 uppercase">
            <th className="p-3 rounded-tl-lg">Category Name</th>
            <th className="p-3 text-right">Quantity Sold</th>
            <th className="p-3 text-right rounded-tr-lg">Total Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && (
            <tr>
              <td colSpan="3" className="p-8 text-center text-slate-500">
                Loading category data...
              </td>
            </tr>
          )}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan="3" className="p-8 text-center text-slate-500">
                No data available for this range.
              </td>
            </tr>
          )}
          {!loading && data.map((cat, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="p-3 text-sm font-bold text-slate-800">{cat.name}</td>
              <td className="p-3 text-sm text-slate-600 text-right">{cat.quantity} items</td>
              <td className="p-3 text-sm font-black text-slate-900 text-right">₹{(cat.sales / 100).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </DetailModal>
  );
}
