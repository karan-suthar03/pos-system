import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { formatOrderDateTime } from '../utils/dateTime';

function OrderDetailsPanel({ order, getOrderTotal }) {
  if (!order) {
    return (
      <section className="flex-1 h-full overflow-hidden flex flex-col">
        <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Order Selected</h3>
          <p className="text-gray-500 max-w-sm">Pick an order from the list to preview static details.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 h-full overflow-hidden flex flex-col">
      <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-white flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Order #{order.tag}</h1>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider border border-blue-100 flex items-center gap-1.5">
                <Clock size={12} /> Active
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock size={15} /> {formatOrderDateTime(order.createdAt)}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="flex items-center gap-1.5">
                <ShoppingBag size={15} /> {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
              </span>
            </div>
          </div>

          <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <Printer size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
          <div className="bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-6">Item Details</div>
              <div className="col-span-3 text-center">Qty</div>
              <div className="col-span-3 text-right">Price</div>
            </div>

            <div className="p-2 px-4">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center px-2 py-3 border-b border-gray-100">
                  <div className="col-span-6">
                    <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-400">@ ₹{(item.price / 100).toFixed(2)} / unit</div>
                  </div>
                  <div className="col-span-3 text-center text-sm font-bold text-gray-700">x{item.quantity}</div>
                  <div className="col-span-3 text-right text-sm font-bold text-gray-900">₹{((item.quantity * item.price) / 100).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
          <div className="px-8 py-5 border-b border-gray-100">
            <div className="flex justify-between items-end border-gray-200">
              <div>
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Amount</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle size={10} /> Pending
                  </span>
                </div>
              </div>
              <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{(getOrderTotal(order) / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <button className="flex items-center gap-3 cursor-pointer px-5 py-3 rounded-xl border transition-all w-full lg:w-auto shadow-sm bg-white border-gray-300 text-gray-600">
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center bg-transparent border-gray-400 text-transparent">
                <CheckCircle2 size={14} />
              </div>
              <span className="font-bold whitespace-nowrap select-none">Mark as Paid</span>
            </button>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button className="px-5 py-3 text-red-600 bg-red-50 border border-red-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none cursor-pointer">
                <Trash2 size={18} />
                <span>Cancel</span>
              </button>

              <button className="px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 flex-1 lg:flex-none transition-all bg-gray-900 hover:bg-black cursor-pointer">
                <CheckCircle2 size={20} />
                <span>Complete Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default OrderDetailsPanel;
