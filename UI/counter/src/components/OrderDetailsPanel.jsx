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
        <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Order Selected</h3>
          <p className="text-gray-500 max-w-sm">Pick an order from the list to preview static details.</p>
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

  let statusBadgeClass = 'bg-blue-50 text-blue-600 border-blue-100';
  let statusLabel = 'Open';

  if (isClosed) {
    statusBadgeClass = 'bg-green-50 text-green-700 border-green-100';
    statusLabel = 'Closed';
  } else if (isCancelled) {
    statusBadgeClass = 'bg-red-50 text-red-600 border-red-100';
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
      <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-white flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Order #{orderLabel}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${statusBadgeClass}`}>
                <Clock size={12} /> {statusLabel}
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
                  <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${order.paymentDone ? 'text-green-700 bg-green-50 border-green-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>
                    <AlertCircle size={10} /> {order.paymentDone ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{(getOrderTotal(order) / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <button
              onClick={() => onTogglePayment?.(order)}
              disabled={isPaymentBusy || isCancelled}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all w-full lg:w-auto shadow-sm ${isPaymentBusy || isCancelled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : order.paymentDone ? 'bg-green-50 border-green-200 text-green-700 cursor-pointer' : 'bg-white border-gray-300 text-gray-700 cursor-pointer'}`}
            >
              <div className={`w-11 h-6 rounded-full relative transition-colors ${order.paymentDone ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${order.paymentDone ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="font-bold whitespace-nowrap select-none">{order.paymentDone ? 'Paid' : 'Not Paid'}</span>
              {isPaymentBusy && <Loader2 size={15} className="animate-spin" />}
            </button>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => setConfirmAction('cancel')}
                disabled={!isOpen || isCancelBusy}
                className={`px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none ${!isOpen || isCancelBusy ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed' : 'text-red-600 bg-red-50 border border-red-200 cursor-pointer'}`}
              >
                {isCancelBusy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                <span>{isCancelBusy ? 'Cancelling...' : 'Cancel'}</span>
              </button>

              <button
                onClick={() => setConfirmAction('complete')}
                disabled={!isOpen || isCompleteBusy}
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 flex-1 lg:flex-none transition-all ${!isOpen || isCompleteBusy ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black cursor-pointer'}`}
              >
                {isCompleteBusy ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                <span>{isCompleteBusy ? 'Completing...' : 'Complete Order'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmAction === 'complete' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
              >
                {confirmAction === 'complete' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmAction === 'complete' ? 'Complete Order?' : 'Cancel Order?'}
              </h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                {confirmAction === 'complete'
                  ? 'This will mark the order as closed.'
                  : 'This will mark the order as cancelled.'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isCancelBusy || isCompleteBusy}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isCancelBusy || isCompleteBusy}
                  className={`px-4 py-2 text-white rounded-lg font-medium shadow-md transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    confirmAction === 'complete'
                      ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                      : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default OrderDetailsPanel;
