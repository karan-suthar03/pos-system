import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Printer,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatOrderDateTime } from '../utils/dateTime';

function OrderDetailsPanel({
  order,
  getOrderTotal,
  onTogglePayment,
  onCancelOrder,
  onCompleteOrder,
  actionState,
}) {
  const [confirmAction, setConfirmAction] = useState(null);

  if (!order) {
    return (
      <section className="flex-1 h-full overflow-hidden flex flex-col">
        <div className="h-full flex flex-col items-center justify-center bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/70 text-center p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <ShoppingBag size={26} className="text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">No Order Selected</h3>
          <p className="text-slate-500 max-w-sm font-medium">Pick an order from the list to preview live details.</p>
        </div>
      </section>
    );
  }

  const isOpen = order.status === 'OPEN';
  const isClosed = order.status === 'CLOSED';
  const isCancelled = order.status === 'CANCELLED';
  const isPaymentBusy = actionState?.orderId === order.id && actionState?.action === 'payment';
  const isCancelBusy = actionState?.orderId === order.id && actionState?.action === 'cancel';
  const isCompleteBusy = actionState?.orderId === order.id && actionState?.action === 'complete';
  const orderLabel = order.tag || order.displayId || order.id;

  let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let statusLabel = 'Open';

  if (isClosed) {
    statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    statusLabel = 'Closed';
  } else if (isCancelled) {
    statusBadgeClass = 'bg-rose-50 text-rose-600 border-rose-100';
    statusLabel = 'Cancelled';
  }

  async function handleConfirmAction() {
    if (confirmAction === 'cancel') {
      await onCancelOrder?.(order);
    } else if (confirmAction === 'complete') {
      await onCompleteOrder?.(order);
    }

    setConfirmAction(null);
  }

  return (
    <section className="flex-1 h-full overflow-hidden flex flex-col">
      <div className="h-full flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden relative transition-all">
        <div className="px-8 py-6 border-b border-slate-200/50 bg-transparent flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Order #{orderLabel}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm ${statusBadgeClass}`}>
                <Clock size={12} strokeWidth={2.5} /> {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock size={15} /> {formatOrderDateTime(order.createdAt)}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5">
                <ShoppingBag size={15} /> {order.items.reduce((acc, item) => {
                  if (item.status === 'CANCELLED') return acc;
                  return acc + item.quantity;
                }, 0)} items
              </span>
            </div>
          </div>

          <button className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-sm border border-slate-100 bg-white">
            <Printer size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
          <div className="bg-transparent overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-100/50 border-b border-slate-200/50 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <div className="col-span-6">Item Details</div>
              <div className="col-span-3 text-center">Qty</div>
              <div className="col-span-3 text-right">Price</div>
            </div>

            <div className="p-4 px-6 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center px-4 py-4 bg-white/60 border border-slate-100 rounded-2xl shadow-sm transition-all hover:bg-white hover:shadow-md">
                  <div className="col-span-6">
                    <div className="text-sm font-bold text-slate-800 tracking-tight">{item.name}</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">@ ₹{(item.price / 100).toFixed(2)} / unit</div>
                  </div>
                  <div className="col-span-3 text-center text-sm font-bold text-slate-700 bg-slate-50 py-1.5 rounded-lg w-max mx-auto px-3 border border-slate-100">x{item.quantity}</div>
                  <div className="col-span-3 text-right text-sm font-black text-slate-900 tracking-tight">₹{((item.quantity * item.price) / 100).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
          <div className="px-8 py-5 border-b border-slate-100/50">
            <div className="flex justify-between items-end border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border shadow-sm uppercase tracking-wide ${order.paymentDone ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-orange-600 bg-orange-50 border-orange-200'}`}>
                    <AlertCircle size={10} strokeWidth={3} /> {order.paymentDone ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{(getOrderTotal(order) / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="p-6 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <button
              onClick={() => onTogglePayment?.(order)}
              disabled={isPaymentBusy || isCancelled}
              className={`group flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all duration-300 w-full lg:w-auto shadow-sm hover:shadow-md ${isPaymentBusy || isCancelled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : order.paymentDone ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700 cursor-pointer hover:border-emerald-300' : 'bg-white border-slate-300 text-slate-700 cursor-pointer hover:border-slate-400'}`}
            >
              <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${order.paymentDone ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${order.paymentDone ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
              <span className="font-bold whitespace-nowrap select-none tracking-wide text-sm">{order.paymentDone ? 'PAID' : 'NOT PAID'}</span>
              {isPaymentBusy && <Loader2 size={16} className="animate-spin opacity-70" />}
            </button>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => setConfirmAction('cancel')}
                disabled={!isOpen || isCancelBusy}
                className={`px-6 py-3.5 rounded-2xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 flex-1 lg:flex-none text-sm group ${!isOpen || isCancelBusy ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed' : 'text-red-600 bg-red-50/50 border border-red-200 hover:bg-red-50 hover:border-red-300 hover:shadow-sm cursor-pointer'}`}
              >
                {isCancelBusy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} className="transition-transform group-hover:scale-110" />}
                <span>{isCancelBusy ? 'Cancelling...' : 'Cancel'}</span>
              </button>

              <button
                onClick={() => setConfirmAction('complete')}
                disabled={!isOpen || isCompleteBusy}
                className={`px-8 py-3.5 rounded-2xl font-bold text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.6)] flex items-center justify-center gap-2 flex-1 lg:flex-none transition-all duration-300 text-sm group ${!isOpen || isCompleteBusy ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgba(15,23,42,0.8)] cursor-pointer'}`}
              >
                {isCompleteBusy ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} className="transition-transform group-hover:scale-110" />}
                <span>{isCompleteBusy ? 'Completing...' : 'Complete Order'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmAction && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-140 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_24px_70px_-24px_rgba(15,23,42,0.5)] border border-slate-200/70 w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="p-6 text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmAction === 'complete' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                  >
                    {confirmAction === 'complete' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                    {confirmAction === 'complete' ? 'Complete Order?' : 'Cancel Order?'}
                  </h3>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    {confirmAction === 'complete'
                      ? 'This will mark the order as closed.'
                      : 'This will mark the order as cancelled.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConfirmAction(null)}
                      disabled={isCancelBusy || isCompleteBusy}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmAction}
                      disabled={isCancelBusy || isCompleteBusy}
                      className={`px-4 py-2 text-white rounded-xl font-medium shadow-md transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                        confirmAction === 'complete'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                          : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

export default OrderDetailsPanel;
