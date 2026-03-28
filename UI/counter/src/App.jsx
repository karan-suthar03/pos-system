import { useEffect, useMemo, useState } from 'react';
import CounterHeader from './components/CounterHeader';
import StatsBar from './components/StatsBar';
import OrdersSidebar from './components/OrdersSidebar';
import OrderDetailsPanel from './components/OrderDetailsPanel';
import CreateOrderPopup from './components/CreateOrderPopup';
import DraftsModal from './components/DraftsModal';
import { getOrders } from './API/orders';
import { useDrafts } from './hooks/useDrafts';

function getOrderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function App() {
  const [showCreateOrderPopup, setShowCreateOrderPopup] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftToResume, setDraftToResume] = useState(null);
  const { drafts, addDraft, updateDraft, deleteDraft, getDraft } = useDrafts();

  async function fetchOrders() {
    const fetched = await getOrders();
    setOrders(fetched);
    setSelectedOrderId((currentSelectedId) => {
      if (currentSelectedId && fetched.some((order) => order.id === currentSelectedId)) {
        return currentSelectedId;
      }
      return fetched[0]?.id ?? null;
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

  const stats = useMemo(() => {
    const active = orders.filter((order) => order.status !== 'CLOSED').length;
    const closed = orders.filter((order) => order.status === 'CLOSED').length;
    const revenue = orders
      .filter((order) => order.paymentDone)
      .reduce((sum, order) => sum + getOrderTotal(order), 0);
    const draftCount = drafts.length;
    return { active, closed, revenue, draftCount };
  }, [orders, drafts]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || orders[0] || null;

  function handleOrderCreated() {
    setShowCreateOrderPopup(false);
    setEditingDraftId(null);
    setDraftToResume(null);

    if (editingDraftId) {
      deleteDraft(editingDraftId);
    }

    fetchOrders();
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

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans text-slate-900">
      <CounterHeader />
      <StatsBar
        stats={stats}
        onCreateOrder={() => {
          setEditingDraftId(null);
          setDraftToResume(null);
          setShowCreateOrderPopup(true);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row w-full flex-1 gap-6 h-[calc(100vh-180px)]">
        <OrdersSidebar
          orders={orders}
          selectedOrderId={selectedOrder?.id}
          onSelectOrder={setSelectedOrderId}
          getOrderTotal={getOrderTotal}
          draftCount={drafts.length}
          onViewDrafts={() => setShowDraftsModal(true)}
        />
        <OrderDetailsPanel order={selectedOrder} getOrderTotal={getOrderTotal} />
      </main>

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