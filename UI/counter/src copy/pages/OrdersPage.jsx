import { useEffect, useState, useMemo } from "react";
import Header from "../components/Header";
import OrderPopup from "../components/OrderPopup";
import OrderCard from "../components/OrderCard";
import {
  getOrders,
  closeOrder,
  toggleServedStatus,
  deleteItemFromOrder,
  toggleOrderPayment,
  cancelOrder,
} from "../API/orders.js";
import { setBackPressHandler } from "../API/index.js";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  IndianRupeeIcon,
  Menu,
  ReceiptIndianRupeeIcon,
  CreditCard,
  ChevronRight,
  AlertCircle,
  Utensils,
  Hourglass,
  FileText,
  Trash2,
  Edit3,
  X // Added X for the modal close button
} from "lucide-react";
import dayjs from "dayjs";
import { printOrder } from "../API/printer.js";
import { useDrafts } from "../hooks/useDrafts";


function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false); // New state for drafts modal
  const [filterStatus, setFilterStatus] = useState("active");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(() => {
    const saved = localStorage.getItem('autoPayEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [activeCategoryInPopup, setActiveCategoryInPopup] = useState(null);
  
  // Draft management
  const { drafts, addDraft, updateDraft, deleteDraft, getDraft } = useDrafts();
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftToResume, setDraftToResume] = useState(null);

  // --- Timer State ---
  const [currentTime, setCurrentTime] = useState(dayjs());

  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    type: null,
    orderId: null,
    callBack: null,
  });

  // --- Save autopay preference ---
  useEffect(() => {
    localStorage.setItem('autoPayEnabled', JSON.stringify(autoPayEnabled));
  }, [autoPayEnabled]);

  // --- Auto-close drafts modal if empty ---
  useEffect(() => {
    if (drafts.length === 0 && showDraftsModal) {
      setShowDraftsModal(false);
    }
  }, [drafts, showDraftsModal]);

  // --- Data Fetching ---
  useEffect(() => {
    fetchOrders();
  }, []);

  // --- Update Timer every 30 seconds ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // --- Back Button Handler ---
  useEffect(() => {
    const handleBackPress = () => {
      // Priority 1: Close drafts modal
      if (showDraftsModal) {
        setShowDraftsModal(false);
        return true;
      }
      
      // Priority 2: Unselect category in popup if one is selected
      if (showOrderPopup && activeCategoryInPopup !== null) {
        setActiveCategoryInPopup(null);
        return true; // Handled
      }
      
      // Priority 3: Close create order popup if open
      if (showOrderPopup) {
        setShowOrderPopup(false);
        return true; // Handled
      }
      
      // Priority 4: Close order card if open
      if (selectedOrderId !== null) {
        setSelectedOrderId(null);
        return true; // Handled
      }
      
      return false;
    };
    
    setBackPressHandler(handleBackPress);
    
    return () => {
      setBackPressHandler(null);
    };
  }, [showOrderPopup, selectedOrderId, activeCategoryInPopup, showDraftsModal]);

  const fetchOrders = async () => {
    const fetchedOrders = await getOrders();
    setOrders(fetchedOrders);
  };

  // --- Computed Stats & Helpers ---
  const getOrderTotal = (order) => {
    return order.orderTotal;
  };

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "CLOSED").length;
    const closed = orders.filter((o) => o.status === "CLOSED").length;
    const revenue = orders
      .filter((o) => o.paymentDone)
      .reduce((sum, order) => {
        return sum + parseFloat(getOrderTotal(order));
      }, 0);
    const draftCount = drafts.length;
    return { active, closed, revenue, draftCount };
  }, [orders, drafts]);

  // --- Filtering Logic ---
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toString().includes(searchQuery) ||
      order.displayId?.toString().includes(searchQuery);

    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "active")
      return matchesSearch && order.status !== "CLOSED";
    if (filterStatus === "closed")
      return matchesSearch && order.status === "CLOSED";
    return matchesSearch;
  });

  const visibleOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    return sorted;
  }, [filteredOrders, filterStatus]);

  // --- Handlers ---
  const handleCreateOrder = () => setShowOrderPopup(true);

  const handleConfirmOrderCreation = async () => {
    const fetchedOrders = await getOrders();
    setOrders(fetchedOrders);
    setShowOrderPopup(false);
    setActiveCategoryInPopup(null);
    setEditingDraftId(null);
    setDraftToResume(null);
    
    if (fetchedOrders.length > 0) {
      const mostRecentOrder = fetchedOrders.reduce((max, order) => 
        order.id > max.id ? order : max
      , fetchedOrders[0]);
      setSelectedOrderId(mostRecentOrder.id);
      printOrder(mostRecentOrder.id, 'KOT');
    }
  };

  const handleSaveDraft = (order, draftId = null) => {
    if (draftId) {
      updateDraft(draftId, order);
    } else {
      addDraft(order);
    }
  };

  const handleResumeDraft = (draftId) => {
    const draft = getDraft(draftId);
    if (draft) {
      setDraftToResume(draft);
      setEditingDraftId(draftId);
      setShowDraftsModal(false); // Close modal when resuming
      setShowOrderPopup(true);
    }
  };

  const handleDeleteDraft = (draftId) => {
    deleteDraft(draftId);
  };

  const handleRemoveItem = (itemId) => {
    (async () => {
      try {
        await deleteItemFromOrder(itemId);
        setOrders((prev) =>
          prev.map((order) => ({
            ...order,
            items: order.items.filter((item) => item.id !== itemId),
          })),
        );
      } catch (error) {
        console.log(error);
      }
    })();
  };

  const handleToggleServed = (orderId, itemId) => {
    (async () => {
      try {
        let result = await toggleServedStatus(orderId, itemId);
        setOrders((prev) =>
          prev.map((order) => {
            if (order.id !== orderId) return order;
            return {
              ...order,
              items: order.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      status: result.status,
                    }
                  : item,
              ),
            };
          }),
        );
      } catch (error) {
        console.log(error);
      }
    })();
  };

  const handleTogglePayment = (orderId) => {
    (async () => {
      try {
        let result = await toggleOrderPayment(orderId);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, paymentDone: result.isPaymentDone }
              : order,
          ),
        );
      } catch (error) {
        console.log(error);
      }
    })();
  };

  const openConfirmDialog = (type, orderId, callBack) =>
    setConfirmDialog({ show: true, type, orderId, callBack });

  const executeDialogAction = () => {
    const { type, orderId } = confirmDialog;
    if (type === "cancel") {
      (async () => {
        await cancelOrder(orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));    
        if (selectedOrderId === orderId) setSelectedOrderId(null);
        setConfirmDialog({
          show: false,
          type: null,
          orderId: null,
          callBack: null,
        });  
        if (confirmDialog.callBack) confirmDialog.callBack();
      })();
    } else if (type === "close") {
      (async () => {
        try {
          await closeOrder(orderId);
          if (autoPayEnabled) {
            const order = orders.find(o => o.id === orderId);
            if (order && !order.paymentDone) {
              await toggleOrderPayment(orderId);
            }
          }
          fetchOrders();
          setConfirmDialog({
            show: false,
            type: null,
            orderId: null,
            callBack: null,
          });
        } catch (err) {
          console.error("Error closing order:", err);
        } finally {
          if (confirmDialog.callBack) confirmDialog.callBack();
        }
      })();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans text-slate-900">
      <Header />

      {/* --- Dashboard Stats Bar --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Active Orders"
              value={stats.active}
              icon={Clock}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatCard
              label="Closed"
              value={stats.closed}
              icon={CheckCircle2}
              color="text-green-600"
              bg="bg-green-50"
            />
            <StatCard
              label="Total Revenue"
              value={`₹${(stats.revenue / 100).toFixed(2)}`}
              icon={IndianRupeeIcon}
              color="text-indigo-600"
              bg="bg-indigo-50"
            />
            <button
              onClick={handleCreateOrder}
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Plus size={20} />
              <span>New Order</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row w-full flex-1 gap-6 h-[calc(100vh-180px)]">
        {/* --- Sidebar (Detailed List) --- */}
        <aside
          className={`
          w-full lg:w-87.5 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col shrink-0
          ${isSidebarOpen ? "fixed inset-0 z-40 m-4 lg:m-0 lg:static" : "hidden lg:flex"}
        `}
        >
          {/* Mobile Close Button */}
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden absolute top-4 right-4 p-2 bg-gray-100 rounded-full"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Search & Filters Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-white z-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ReceiptIndianRupeeIcon size={18} className="text-blue-600" />
                Orders List
              </h2>
              <button
                onClick={() => setAutoPayEnabled(!autoPayEnabled)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all cursor-pointer ${
                  autoPayEnabled
                    ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
                title={autoPayEnabled ? 'Auto-pay enabled' : 'Auto-pay disabled'}
              >
                <div className={`w-8 h-4 rounded-full relative transition-all ${
                  autoPayEnabled ? 'bg-green-500' : 'bg-gray-400'
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${
                    autoPayEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </div>
                <CreditCard size={14} />
              </button>
            </div>
            
            <div className="relative mb-3 group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
              />
            </div>

            <div className="flex bg-gray-100/50 p-1 rounded-lg">
              {["active", "closed", "all"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`
                    flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all
                    ${
                      filterStatus === tab
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/50 cursor-pointer"
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* --- NEW DRAFTS TRIGGER BUTTON --- */}
            {drafts.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDraftsModal(true)}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-300 shadow-sm text-amber-800 px-4 py-2.5 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-amber-600" />
                    <span className="text-sm font-bold">Saved Drafts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-200/70 text-amber-800 text-xs font-black px-2 py-1 rounded-md">
                      {drafts.length}
                    </span>
                    <ChevronRight size={16} className="text-amber-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Order List (Now strictly dedicated to API orders) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-gray-50/30">
            {visibleOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                <ReceiptIndianRupeeIcon size={32} className="mb-2 opacity-20" />
                <p>No orders found</p>
              </div>
            ) : (
              visibleOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const total = getOrderTotal(order);
                const orderLabel =
                  (order.tag && order.tag.trim()) || order.displayId || order.id;
                const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
                const pendingItems = order.items.filter((item) => item.status !== "SERVED").length;
                const isFullyServed = pendingItems === 0 && itemCount > 0;

                const isOpen = order.status !== "CLOSED";
                const createdTime = dayjs(order.createdAt);
                const diffInMinutes = currentTime.diff(createdTime, "minute");
                const timeDisplay = `${diffInMinutes}m`;

                let urgency = "safe"; 
                if (isOpen) {
                  if (diffInMinutes >= 15) urgency = "critical"; 
                  else if (diffInMinutes >= 10) urgency = "warning"; 
                }

                let cardClasses = "";
                let textMainColor = "";
                let textSubColor = "";
                let badgeClass = "";
                let iconType = Clock;

                if (isSelected) {
                    if (order.status === "CLOSED") {
                        cardClasses = "bg-[#F3F4F6] border-green-700 shadow-lg";
                        textMainColor = "text-gray-900";
                        textSubColor = "text-gray-500";
                        badgeClass = "bg-gray-200 text-gray-600";
                    } else {
                        textMainColor = "text-white";
                        if (urgency === "critical") {
                            cardClasses = "bg-red-600 border-red-700 shadow-md shadow-red-200 animate-pulse-slow";
                            textSubColor = "text-red-100";
                            badgeClass = "bg-white/20 text-white";
                            iconType = AlertCircle;
                        } else if (urgency === "warning") {
                            cardClasses = "bg-orange-500 border-orange-600 shadow-md shadow-orange-200";
                            textSubColor = "text-orange-50";
                            badgeClass = "bg-white/20 text-white";
                            iconType = Hourglass;
                        } else {
                            cardClasses = "bg-emerald-600 border-emerald-600 shadow-md shadow-emerald-200";
                            textSubColor = "text-emerald-50";
                            badgeClass = "bg-white/20 text-white";
                            iconType = Clock;
                        }
                    }
                } else {
                    if (order.status === "CLOSED") {
                        cardClasses = "bg-white border-gray-200 hover:border-blue-300";
                        textMainColor = "text-gray-900";
                        textSubColor = "text-gray-400";
                    } else {
                        if (urgency === "critical") {
                            cardClasses = "bg-red-50 border-red-300 shadow-sm";
                            textMainColor = "text-red-900";
                            textSubColor = "text-red-600";
                            badgeClass = "bg-red-100 text-red-700";
                            iconType = AlertCircle;
                        } else if (urgency === "warning") {
                            cardClasses = "bg-orange-50 border-orange-200 hover:border-orange-300";
                            textMainColor = "text-gray-900";
                            textSubColor = "text-orange-600";
                            badgeClass = "bg-orange-100 text-orange-700";
                            iconType = Hourglass;
                        } else {
                            cardClasses = "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300";
                            textMainColor = "text-gray-900";
                            textSubColor = "text-emerald-700";
                            badgeClass = "bg-emerald-100 text-emerald-700";
                            iconType = Clock;
                        }
                    }
                }

                const TimerIcon = iconType;

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      group relative p-4 rounded-xl border cursor-pointer transition-all duration-300
                      hover:shadow-md hover:-translate-y-0.5
                      ${cardClasses}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${textMainColor}`}>
                          #{orderLabel}
                        </span>
                        {order.status === "CLOSED" && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}
                          >
                            Closed
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end">
                        {isOpen ? (
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full transition-colors duration-300 ${badgeClass}`}>
                                <TimerIcon size={12} />
                                <span>{timeDisplay}</span>
                            </div>
                        ) : (
                            <span className={`text-xs ${textSubColor} flex items-center gap-1`}>
                                {dayjs(order.createdAt).format("DD MMM, hh:mm A")}
                            </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs ${textSubColor}`}>
                          {itemCount} items
                        </span>

                        {isOpen && pendingItems > 0 && (
                          <div
                            className={`flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
                            ${isSelected ? "bg-white/20 text-white" : (urgency === 'critical' ? "bg-red-200 text-red-800" : "bg-orange-100 text-orange-700")}`}
                          >
                            <Utensils size={10} />
                            {pendingItems} Left
                          </div>
                        )}

                        {isOpen && isFullyServed && (
                          <span className={`text-[10px] font-bold ${isSelected ? "text-white/80" : "text-blue-500"}`}>
                            All Served
                          </span>
                        )}

                        {order.paymentDone && (
                          <div className={`flex items-center gap-1 text-[10px] font-bold uppercase ${isSelected ? "text-green-200" : "text-green-600 bg-green-50 px-1.5 py-0.5 rounded"}`}>
                            <CreditCard size={10} />
                            Paid
                          </div>
                        )}
                      </div>
                      <span className={`text-lg font-black ${textMainColor}`}>
                        ₹{(total/100).toFixed(2)}
                      </span>
                    </div>

                    {isSelected && (
                      <ChevronRight
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20"
                        size={40}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* --- Main Content Area --- */}
        <main className="flex-1 h-full overflow-hidden flex flex-col">
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-bold text-gray-700 w-full"
            >
              <Menu size={16} />
              View Order List ({visibleOrders.length})
            </button>
          </div>

          {selectedOrderId ? (
            <div className="h-full overflow-y-auto pb-20 custom-scrollbar pr-1">
              <OrderCard
                order={orders.find((o) => o.id === selectedOrderId)}
                onRemoveItem={handleRemoveItem}
                onToggleServed={handleToggleServed}
                onCancelOrder={async (callBack) =>
                  openConfirmDialog("cancel", selectedOrderId, callBack)
                }
                onCloseOrder={(callBack) =>
                  openConfirmDialog("close", selectedOrderId, callBack)
                }
                onTogglePayment={handleTogglePayment}
                getOrderTotal={getOrderTotal}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white/50 rounded-2xl border-2 border-dashed border-gray-200 text-center p-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <ReceiptIndianRupeeIcon className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                No Order Selected
              </h3>
              <p className="text-gray-500 max-w-sm">
                Select an order from the list on the left to view details,
                manage items, or process payments.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* --- Global Confirmation Dialog --- */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmDialog.type === "close" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
              >
                {confirmDialog.type === "close" ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmDialog.type === "close"
                  ? "Complete Order?"
                  : "Cancel Order?"}
              </h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                {confirmDialog.type === "close"
                  ? "This will mark the order as delivered and move it to history."
                  : "Are you sure? This action will permanently remove the order."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    confirmDialog.callBack && confirmDialog.callBack();
                    setConfirmDialog({
                      show: false,
                      type: null,
                      orderId: null,
                    });
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={executeDialogAction}
                  className={`px-4 py-2 text-white rounded-lg font-medium shadow-md transition-colors cursor-pointer ${
                    confirmDialog.type === "close"
                      ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                      : "bg-red-600 hover:bg-red-700 shadow-red-200"
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW DEDICATED DRAFTS MODAL --- */}
      {showDraftsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-all scale-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Saved Drafts</h2>
                  <p className="text-xs text-gray-500">Resume or manage your incomplete orders</p>
                </div>
              </div>
              <button
                onClick={() => setShowDraftsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Grid of drafts) */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {drafts.map((draft) => {
                  const total = draft.items.reduce((sum, item) => sum + item.price * item.quantity / 100, 0);
                  const itemCount = draft.items.reduce((acc, item) => acc + item.quantity, 0);
                  
                  return (
                    <div
                      key={draft.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all group flex flex-col"
                    >
                      <div className="mb-3">
                        <h3 className="font-bold text-gray-900 truncate text-base">
                          {draft.tag || `Draft ${draft.id}`}
                        </h3>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Saved: {dayjs(draft.createdAt).format("DD MMM YYYY, hh:mm A")}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg mb-4">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Utensils size={14} className="text-gray-400"/> 
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                        <span className="font-bold text-gray-900">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => handleResumeDraft(draft.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 size={16} /> Resume
                        </button>
                        <button
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Draft"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Create Order Popup --- */}
      {showOrderPopup && (
        <OrderPopup
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onConfirm={handleConfirmOrderCreation}
          onCancel={() => {
            setShowOrderPopup(false);
            setActiveCategoryInPopup(null);
            setEditingDraftId(null);
            setDraftToResume(null);
          }}
          activeCategory={activeCategoryInPopup}
          onCategoryChange={setActiveCategoryInPopup}
          initialOrder={draftToResume}
          onSaveDraft={handleSaveDraft}
          editingDraftId={editingDraftId}
        />
      )}
    </div>
  );
}

// Simple internal component for stats
function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 transition-transform hover:scale-[1.02]">
      <div className={`p-2 sm:p-3 rounded-lg ${bg} ${color} shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-black text-gray-900 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

export default OrdersPage;