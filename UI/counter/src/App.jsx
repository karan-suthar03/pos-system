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
import { useDrafts } from './hooks/useDrafts';

function getOrderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function App() {
  const [showCreateOrderPopup, setShowCreateOrderPopup] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [autoPayEnabled, setAutoPayEnabled] = useState(() => {
    const saved = localStorage.getItem('counter_auto_pay_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [actionState, setActionState] = useState({ orderId: null, action: null });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftToResume, setDraftToResume] = useState(null);
  const { drafts, addDraft, updateDraft, deleteDraft, getDraft } = useDrafts();

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
      return visibleOrders[0]?.id ?? null;
    });
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (showDraftsModal && drafts.length === 0) {
      setShowDraftsModal(false);
    }
  }, [showDraftsModal, drafts.length]);

  useEffect(() => {
    localStorage.setItem('counter_auto_pay_enabled', String(autoPayEnabled));
  }, [autoPayEnabled]);

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
    visibleOrders.find((order) => order.id === selectedOrderId) ||
    visibleOrders[0] ||
    null;

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

  async function runOrderAction(order, action, execute) {
    if (!order?.id) {
      return;
    }

    try {
      setActionState({ orderId: order.id, action });
      const updatedOrder = await execute(order.id);
      updateOrderInState(updatedOrder);
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

      <CounterHeader />
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
          selectedOrderId={selectedOrder?.id}
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