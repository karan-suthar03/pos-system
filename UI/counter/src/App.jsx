import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CounterHeader from './components/CounterHeader';
import StatsBar from './components/StatsBar';
import OrdersSidebar from './components/OrdersSidebar';
import OrderDetailsPanel from './components/OrderDetailsPanel';
import CreateOrderPopup from './components/CreateOrderPopup';
import DraftsModal from './components/DraftsModal';
import {
  cancelOrder,
  completeOrder,
  getOrders,
  setOrderPaymentStatus,
} from './API/orders';
import { listLowStockItems } from './API/inventory';
import { getServerStatus } from './API/serverStatus';
import { useDrafts } from './hooks/useDrafts';

function getOrderTotal(order) {
  return order.items.reduce((sum, item) => {
    if (item.status === 'CANCELLED') return sum;
    return sum + item.quantity * item.price;
  }, 0);
}

function formatQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '--';
  }
  return parsed % 1 === 0 ? String(parsed) : parsed.toFixed(2);
}

function App() {
  const [showCreateOrderPopup, setShowCreateOrderPopup] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [stockWarningsEnabled, setStockWarningsEnabled] = useState(() => {
    const saved = localStorage.getItem('counter_stock_warnings_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [autoPayEnabled, setAutoPayEnabled] = useState(() => {
    const saved = localStorage.getItem('counter_auto_pay_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [actionState, setActionState] = useState({ orderId: null, action: null });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftToResume, setDraftToResume] = useState(null);
  const { drafts, addDraft, updateDraft, deleteDraft, getDraft } = useDrafts();

  async function refreshLowStock({ force = false } = {}) {
    if (!stockWarningsEnabled && !force) {
      return;
    }

    try {
      const items = await listLowStockItems();
      setLowStockItems(items || []);
    } catch (error) {
      console.error('Failed to fetch low-stock items:', error);
    }
  }

  async function fetchOrders({ selectNewest = false } = {}) {
    let fetched = [];
    try {
      fetched = await getOrders();
      console.log('Fetched orders:', fetched);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }

    setOrders(fetched);
    const visibleOrders = fetched.filter((order) => order.status !== 'CANCELLED');
    setSelectedOrderId((currentSelectedId) => {
      if (selectNewest) {
        return visibleOrders[0]?.id ?? null;
      }

      if (currentSelectedId && visibleOrders.some((order) => order.id === currentSelectedId)) {
        return currentSelectedId;
      }
      return null;
    });

    refreshLowStock();
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let active = true;

    const refreshStatus = async () => {
      const status = await getServerStatus();
      if (!active) {
        return;
      }
      setServerOnline(Boolean(status?.online));
    };

    refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (showDraftsModal && drafts.length === 0) {
      setShowDraftsModal(false);
    }
  }, [showDraftsModal, drafts.length]);

  useEffect(() => {
    localStorage.setItem('counter_auto_pay_enabled', String(autoPayEnabled));
  }, [autoPayEnabled]);

  useEffect(() => {
    localStorage.setItem('counter_stock_warnings_enabled', String(stockWarningsEnabled));
    if (!stockWarningsEnabled) {
      setLowStockItems([]);
      return;
    }

    refreshLowStock({ force: true });
  }, [stockWarningsEnabled]);

  const stats = useMemo(() => {
    const active = orders.filter((order) => order.status === 'OPEN').length;
    const closed = orders.filter((order) => order.status === 'CLOSED').length;
    const revenue = orders
      .filter((order) => order.paymentDone)
      .reduce((sum, order) => sum + getOrderTotal(order), 0);
    const draftCount = drafts.length;
    return { active, closed, revenue, draftCount };
  }, [orders, drafts]);

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.status !== 'CANCELLED'),
    [orders],
  );

  const selectedOrder =
    visibleOrders.find((order) => order.id === selectedOrderId) || null;

  function handleOrderCreated() {
    setShowCreateOrderPopup(false);
    setEditingDraftId(null);
    setDraftToResume(null);

    if (editingDraftId) {
      deleteDraft(editingDraftId);
    }

    fetchOrders({ selectNewest: true });
  }

  function handleSaveDraft(order, draftId = null) {
    if (draftId) {
      updateDraft(draftId, order);
      return;
    }

    addDraft(order);
  }

  function handleResumeDraft(draftId) {
    const draft = getDraft(draftId);
    if (!draft) {
      return;
    }

    setDraftToResume(draft);
    setEditingDraftId(draftId);
    setShowDraftsModal(false);
    setShowCreateOrderPopup(true);
  }

  function handleCloseCreatePopup() {
    setShowCreateOrderPopup(false);
    setEditingDraftId(null);
    setDraftToResume(null);
  }

  function updateOrderInState(updatedOrder) {
    if (!updatedOrder) {
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
    );
  }

  function handleOpenAlerts() {
    setShowAlertsModal(true);
    refreshLowStock({ force: true });
  }

  async function runOrderAction(order, action, execute) {
    if (!order?.id) {
      return;
    }

    try {
      setActionState({ orderId: order.id, action });
      const updatedOrder = await execute(order.id);
      updateOrderInState(updatedOrder);
      refreshLowStock();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setActionState({ orderId: null, action: null });
    }
  }

  async function handleTogglePayment(order) {
    await runOrderAction(order, 'payment', (orderId) =>
      setOrderPaymentStatus(orderId, !order.paymentDone),
    );
  }

  async function handleCancelOrder(order) {
    await runOrderAction(order, 'cancel', (orderId) => cancelOrder(orderId));
  }

  async function handleCompleteOrder(order) {
    await runOrderAction(order, 'complete', async (orderId) => {
      let updatedOrder = await completeOrder(orderId);
      if (autoPayEnabled && updatedOrder && !updatedOrder.paymentDone) {
        updatedOrder = await setOrderPaymentStatus(orderId, true);
      }

      return updatedOrder;
    });
  }

  return (
    <div className="relative min-h-screen bg-slate-50/30 font-sans text-slate-900 flex flex-col selection:bg-amber-100">
      {/* Subtle Background Glows (matching Launcher) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none fixed -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-amber-50/80 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-50/80 rounded-full blur-[120px]" />
      </div>

      <CounterHeader
        stockWarningsEnabled={stockWarningsEnabled}
        onToggleStockWarnings={() => setStockWarningsEnabled((current) => !current)}
        lowStockCount={lowStockItems.length}
        onOpenAlerts={handleOpenAlerts}
        serverOnline={serverOnline}
      />
      <StatsBar
        stats={stats}
        onCreateOrder={() => {
          setEditingDraftId(null);
          setDraftToResume(null);
          setShowCreateOrderPopup(true);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 gap-6 flex flex-col lg:flex-row h-full py-8 mt-4 mb-4 z-10">
        <OrdersSidebar
          orders={orders}
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
          getOrderTotal={getOrderTotal}
          draftCount={drafts.length}
          onViewDrafts={() => setShowDraftsModal(true)}
          autoPayEnabled={autoPayEnabled}
          onToggleAutoPay={() => setAutoPayEnabled((current) => !current)}
        />
        <OrderDetailsPanel
          order={selectedOrder}
          getOrderTotal={getOrderTotal}
          onTogglePayment={handleTogglePayment}
          onCancelOrder={handleCancelOrder}
          onCompleteOrder={handleCompleteOrder}
          actionState={actionState}
        />
      </main>

      {/* Powered by Triniti Solutions Footer */}
      <footer className="w-full pb-4 text-center z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:text-slate-500 cursor-default">
          powered by <span className="text-slate-400">triniti solutions</span>
        </p>
      </footer>

      {showAlertsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          onClick={() => setShowAlertsModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-slate-200/70 bg-white/95 backdrop-blur-xl shadow-[0_24px_70px_-24px_rgba(15,23,42,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <AlertTriangle size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Notifications</p>
                  <p className="text-base font-semibold text-slate-800">Stock alerts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertsModal(false)}
                className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              {!stockWarningsEnabled ? (
                <div className="text-sm text-slate-500">
                  Stock alerts are turned off.
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="text-sm text-slate-500">No low-stock alerts right now.</div>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div
                      key={`alert-${item.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                        {item.category && (
                          <p className="text-xs text-slate-400 mt-1">{item.category}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-rose-700">
                          {formatQuantity(item.onHand)} {item.unit}
                        </div>
                        {item.lowStockThreshold > 0 && (
                          <div className="text-xs text-rose-500">
                            Threshold {formatQuantity(item.lowStockThreshold)} {item.unit}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CreateOrderPopup
        isOpen={showCreateOrderPopup}
        onClose={handleCloseCreatePopup}
        onConfirm={handleOrderCreated}
        initialOrder={draftToResume}
        editingDraftId={editingDraftId}
        onSaveDraft={handleSaveDraft}
      />

      <DraftsModal
        isOpen={showDraftsModal}
        drafts={drafts}
        onClose={() => setShowDraftsModal(false)}
        onResumeDraft={handleResumeDraft}
        onDeleteDraft={deleteDraft}
      />
    </div>
  );
}

export default App;