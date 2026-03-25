import {
  Trash2,
  CheckCircle,
  Clock,
  ShoppingBag,
  ReceiptIndianRupeeIcon as Receipt,
  Printer,
  AlertCircle,
  Loader2, // Imported Loader
  ChevronDown,
} from "lucide-react";
import OrderItemsList from "./OrderItemsList";
import dayjs from "dayjs";
import { useState, useRef, useEffect } from "react";
import { printOrder } from "../API/printer";

function OrderCard({
  order,
  onRemoveItem,
  onToggleServed,
  onCancelOrder,
  onCloseOrder,
  onTogglePayment,
  getOrderTotal,
}) {
  if (!order) return null;

  // Local loading states
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const printMenuRef = useRef(null);

  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
  const isClosed = order.status === "CLOSED";
  const totalAmount = getOrderTotal(order);
  const orderLabel =
    (order.tag && order.tag.trim()) || order.displayId || order.id;

  // Helper to check if any action is currently in progress
  const isBusy = isCompleting || isCancelling || isPaymentLoading;

  // --- Handlers ---

  const handlePrintKOT = async () => {
    printOrder(order.id, 'KOT');
    setShowPrintMenu(false);
  };

  const handlePrintCustomerReceipt = async () => {
    printOrder(order.id, 'CUSTOMER_RECEIPT');
    setShowPrintMenu(false);
  };

  // Close print menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target)) {
        setShowPrintMenu(false);
      }
    };

    if (showPrintMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPrintMenu]);

  const handleCancel = async () => {
    setIsCancelling(true);
    onCancelOrder(async () => {
      setIsCancelling(false);
    });
  };

  const handleCloseOrder = async () => {
    setIsCompleting(true);
    onCloseOrder(() => {
      setIsCompleting(false);
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Loading Overlay (Optional: covers the card if you want to block all interaction strictly) */}
      {/* {isBusy && <div className="absolute inset-0 bg-white/50 z-50 cursor-wait" />} */}

      {/* --- Header Section --- */}
      <div className="px-8 py-6 border-b border-gray-100 bg-white flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Order #{orderLabel}
            </h1>
            {isClosed ? (
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider border border-gray-200 flex items-center gap-1.5">
                <CheckCircle size={12} /> Closed
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider border border-blue-100 flex items-center gap-1.5 animate-pulse">
                <Clock size={12} /> Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock size={15} />{" "}
              {dayjs(order.createdAt).format("DD MMM YYYY, hh:mm A")}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={15} /> {itemCount} items
            </span>
          </div>
        </div>

        {/* Top Actions (Print) */}
        <div className="relative" ref={printMenuRef}>
          <button
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            title="Print Options"
            onClick={() => setShowPrintMenu(!showPrintMenu)}
            disabled={isBusy}
          >
            <Printer size={20} />
            <ChevronDown size={16} className={`transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Print Dropdown Menu */}
          {showPrintMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
              <button
                onClick={handlePrintKOT}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer border-b border-gray-100"
              >
                <Printer size={18} className="text-gray-600" />
                <div>
                  <div className="font-semibold text-gray-900">Print KOT</div>
                  <div className="text-xs text-gray-500">Kitchen Order Ticket</div>
                </div>
              </button>
              <button
                onClick={handlePrintCustomerReceipt}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Receipt size={18} className="text-gray-600" />
                <div>
                  <div className="font-semibold text-gray-900">Print Customer Receipt</div>
                  <div className="text-xs text-gray-500">Payment receipt with details</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Scrollable Content: Items List --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
        <div>
          {order.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-60">
              <Receipt size={48} className="mb-4 text-gray-300" />
              <p className="text-lg font-medium">No items in this order</p>
            </div>
          ) : (
            <div className="bg-white shadow-sm overflow-hidden">
              {/* Header for the table-like list */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-6">Item Details</div>
                <div className="col-span-3 text-center">Qty</div>
                <div className="col-span-3 text-right">Price</div>
              </div>

              <div className="p-2 px-4">
                <OrderItemsList
                  items={order.items}
                  onRemove={isClosed || isBusy ? null : onRemoveItem}
                  onToggleServed={
                    isClosed || isBusy
                      ? null
                      : (itemId) => onToggleServed(order.id, itemId)
                  }
                  showCheckbox={true}
                  readOnly={isClosed || isBusy}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Footer: Totals & Actions --- */}
      <div className="bg-white border-t border-gray-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
        {/* Financial Summary */}
        <div className="px-8 py-5 border-b border-gray-100">
          <div className="flex justify-between items-end border-gray-200">
            <div>
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Total Amount
              </span>
              <div className="flex items-center gap-2 mt-1">
                {/* Payment Status Badge in Footer */}
                {order.paymentDone ? (
                  <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle size={10} /> Paid
                  </span>
                ) : (
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle size={10} /> Pending
                  </span>
                )}
              </div>
            </div>
            <span className="text-4xl font-black text-gray-900 tracking-tighter">
              ₹{(totalAmount / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 bg-gray-50 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Left: Payment Toggle */}
          <button
            onClick={() => {
              onTogglePayment(order.id);
            }}
            disabled={isBusy}
            className={`
            flex items-center gap-3 cursor-pointer px-5 py-3 rounded-xl border transition-all w-full lg:w-auto shadow-sm group relative overflow-hidden
            disabled:opacity-70 disabled:cursor-not-allowed
            ${
              order.paymentDone
                ? "bg-green-500 border-green-600 text-white"
                : "bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
            }
          `}
          >
            <div
              className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
              ${order.paymentDone ? "bg-white/20 border-white text-white" : "bg-transparent border-gray-400 text-transparent"}
            `}
            >
              {isPaymentLoading ? (
                <Loader2 size={14} className="animate-spin text-current" />
              ) : (
                <CheckCircle
                  size={14}
                  fill={order.paymentDone ? "currentColor" : "none"}
                />
              )}
            </div>
            <span className="font-bold whitespace-nowrap select-none">
              {order.paymentDone ? "Payment Received" : "Mark as Paid"}
            </span>
          </button>

          {/* Right: Primary Actions */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {!isClosed && (
              <button
                onClick={handleCancel}
                disabled={isBusy}
                className="px-5 py-3 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed "
                title="Cancel Order"
              >
                {isCancelling ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                <span className="lg:hidden xl:inline">
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </span>
              </button>
            )}

            <button
              onClick={handleCloseOrder}
              disabled={isClosed || isBusy}
              className={`
                px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 flex-1 lg:flex-none transition-all transform
                ${
                  isClosed || isBusy
                    ? "bg-gray-400 cursor-not-allowed shadow-none opacity-80"
                    : "bg-gray-900 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:scale-95"
                }
              `}
            >
              {isCompleting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <CheckCircle size={20} />
              )}

              <span>
                {isCompleting
                  ? "Processing..."
                  : isClosed
                    ? "Order Completed"
                    : "Complete Order"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderCard;
