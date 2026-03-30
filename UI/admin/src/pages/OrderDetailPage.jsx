import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Minus,
  PencilLine,
  Plus,
  ReceiptIndianRupee,
  Save,
  Trash2,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { getDishes } from '../API/dishes.js';
import {
  addOrderItem,
  getOrderById,
  removeOrderItem,
  setOrderPaymentStatus,
  setOrderStatus,
  updateOrderItemQuantity,
  updateOrderTag,
} from '../API/orders.js';

const ORDER_STATUSES = ['OPEN', 'CLOSED', 'CANCELLED'];

function formatDateTime(timestamp) {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

function getOrderStatusClass(status) {
  if (status === 'CLOSED') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (status === 'CANCELLED') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function getOrderStatusIcon(status) {
  if (status === 'CLOSED') {
    return <CheckCircle2 size={12} strokeWidth={3} />;
  }

  if (status === 'CANCELLED') {
    return <XCircle size={12} strokeWidth={3} />;
  }

  return <Clock3 size={12} strokeWidth={3} />;
}

function PaymentBadge({ paymentDone }) {
  const className = paymentDone
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${className}`}>
      {paymentDone ? 'PAID' : 'PENDING'}
    </span>
  );
}

function normalizeDishesByCategory(rawDishes) {
  if (!rawDishes || typeof rawDishes !== 'object') {
    return [];
  }

  const rows = [];
  Object.entries(rawDishes).forEach(([category, dishes]) => {
    if (!Array.isArray(dishes)) {
      return;
    }

    dishes.forEach((dish) => {
      rows.push({
        id: Number(dish?.id || 0),
        name: dish?.name || 'Unnamed dish',
        price: Number(dish?.price || 0),
        category: category || dish?.category || 'Other',
      });
    });
  });

  return rows.filter((dish) => dish.id > 0);
}

function normalizeTag(value) {
  return String(value || '').trim();
}

function isNewDraftItem(item) {
  return typeof item?.id === 'string' && item.id.startsWith('new-');
}

function toDraftItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    id: Number(item.id),
    dishId: Number(item.dishId),
    name: item.name || 'Unnamed item',
    price: Number(item.price || 0),
    quantity: Math.max(1, Number(item.quantity) || 1),
  }));
}

function LoadingState({ navigate }) {
  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8 sm:py-10">
        <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-7 sm:p-8 text-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Loading Order Details</h2>
          <p className="text-sm text-slate-500 mt-1">Pulling the latest information from your order history.</p>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="mt-5 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, navigate }) {
  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8 sm:py-10">
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(244,63,94,0.65)] p-7 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-4">
            <XCircle size={22} />
          </div>
          <h2 className="text-lg font-bold text-rose-800">Order Not Available</h2>
          <p className="text-sm text-rose-700/90 mt-1">{message || 'We could not find this order.'}</p>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="mt-5 h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tagDraft, setTagDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('OPEN');
  const [paymentDraft, setPaymentDraft] = useState(false);
  const [itemDrafts, setItemDrafts] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const [notice, setNotice] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const localItemSeedRef = useRef(1);

  const [dishes, setDishes] = useState([]);
  const [dishesLoading, setDishesLoading] = useState(false);
  const [newDishId, setNewDishId] = useState('');
  const [newDishQuantity, setNewDishQuantity] = useState(1);

  const applyOrderToDraft = (nextOrder) => {
    setOrder(nextOrder);
    setTagDraft(nextOrder?.tag || '');
    setStatusDraft(nextOrder?.orderStatus || 'OPEN');
    setPaymentDraft(Boolean(nextOrder?.paymentDone));
    setItemDrafts(toDraftItems(nextOrder?.items));
  };

  useEffect(() => {
    let isActive = true;

    async function loadOrder() {
      setLoading(true);
      setError('');

      try {
        const result = await getOrderById(orderId);
        if (!isActive) {
          return;
        }

        applyOrderToDraft(result);
        setIsEditMode(false);
      } catch (loadError) {
        console.error('Failed to load order details:', loadError);
        if (!isActive) {
          return;
        }

        setOrder(null);
        setError(loadError?.message || 'Could not load order details.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isActive = false;
    };
  }, [orderId]);

  useEffect(() => {
    let isActive = true;

    async function loadDishes() {
      setDishesLoading(true);

      try {
        const groupedDishes = await getDishes();
        if (!isActive) {
          return;
        }

        const normalizedDishes = normalizeDishesByCategory(groupedDishes);
        setDishes(normalizedDishes);
        if (normalizedDishes.length > 0) {
          setNewDishId(String(normalizedDishes[0].id));
        }
      } catch (dishError) {
        console.error('Failed to load dishes:', dishError);
        if (!isActive) {
          return;
        }
        setDishes([]);
      } finally {
        if (isActive) {
          setDishesLoading(false);
        }
      }
    }

    loadDishes();

    return () => {
      isActive = false;
    };
  }, []);

  const groupedDishes = useMemo(() => {
    const grouped = {};
    dishes.forEach((dish) => {
      if (!grouped[dish.category]) {
        grouped[dish.category] = [];
      }
      grouped[dish.category].push(dish);
    });
    return grouped;
  }, [dishes]);

  const dishById = useMemo(() => {
    const map = new Map();
    dishes.forEach((dish) => {
      map.set(String(dish.id), dish);
    });
    return map;
  }, [dishes]);

  const totalDraftAmount = useMemo(
    () => itemDrafts.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [itemDrafts]
  );

  const displayItems = isEditMode ? itemDrafts : (order?.items || []);
  const displayOrderTotal = isEditMode ? totalDraftAmount : Number(order?.orderTotal || 0);
  const displayStatus = isEditMode ? statusDraft : order?.orderStatus;
  const displayPaymentDone = isEditMode ? paymentDraft : order?.paymentDone;
  const displayTag = isEditMode ? normalizeTag(tagDraft) : normalizeTag(order?.tag);

  const totalItems = useMemo(
    () => displayItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [displayItems]
  );

  const hasPendingChanges = useMemo(() => {
    if (!order) {
      return false;
    }

    if (normalizeTag(tagDraft) !== normalizeTag(order.tag)) {
      return true;
    }

    if (statusDraft !== order.orderStatus) {
      return true;
    }

    if (Boolean(paymentDraft) !== Boolean(order.paymentDone)) {
      return true;
    }

    const originalItems = Array.isArray(order.items) ? order.items : [];
    const originalById = new Map(originalItems.map((item) => [Number(item.id), Number(item.quantity) || 0]));
    const draftExistingItems = itemDrafts.filter((item) => !isNewDraftItem(item));

    if (draftExistingItems.length !== originalItems.length) {
      return true;
    }

    for (const draftItem of draftExistingItems) {
      const draftId = Number(draftItem.id);
      if (!originalById.has(draftId)) {
        return true;
      }

      if ((Number(draftItem.quantity) || 0) !== originalById.get(draftId)) {
        return true;
      }
    }

    if (itemDrafts.some((item) => isNewDraftItem(item))) {
      return true;
    }

    return false;
  }, [order, tagDraft, statusDraft, paymentDraft, itemDrafts]);

  async function handleSaveChanges() {
    if (!order || !hasPendingChanges) {
      setNotice({ type: 'info', message: 'No pending changes to save.' });
      return;
    }

    setBusyAction('save-all');
    setNotice(null);

    try {
      let latestOrder = order;

      const nextTag = normalizeTag(tagDraft);
      const currentTag = normalizeTag(order.tag);
      if (nextTag !== currentTag) {
        latestOrder = await updateOrderTag(latestOrder.id, nextTag || null);
      }

      if (statusDraft !== order.orderStatus) {
        latestOrder = await setOrderStatus(latestOrder.id, statusDraft);
      }

      if (Boolean(paymentDraft) !== Boolean(order.paymentDone)) {
        latestOrder = await setOrderPaymentStatus(latestOrder.id, Boolean(paymentDraft));
      }

      const originalItems = Array.isArray(order.items) ? order.items : [];
      const originalById = new Map(originalItems.map((item) => [Number(item.id), item]));
      const draftExistingItems = itemDrafts.filter((item) => !isNewDraftItem(item));
      const draftById = new Map(draftExistingItems.map((item) => [Number(item.id), item]));

      for (const originalItem of originalItems) {
        const originalId = Number(originalItem.id);
        if (!draftById.has(originalId)) {
          latestOrder = await removeOrderItem(latestOrder.id, originalId);
        }
      }

      for (const draftItem of draftExistingItems) {
        const draftId = Number(draftItem.id);
        const originalItem = originalById.get(draftId);
        if (!originalItem) {
          continue;
        }

        const nextQuantity = Math.max(1, Number(draftItem.quantity) || 1);
        if (nextQuantity !== Number(originalItem.quantity)) {
          latestOrder = await updateOrderItemQuantity(latestOrder.id, draftId, nextQuantity);
        }
      }

      const newDraftItems = itemDrafts.filter((item) => isNewDraftItem(item));
      for (const newItem of newDraftItems) {
        const nextQuantity = Math.max(1, Number(newItem.quantity) || 1);
        latestOrder = await addOrderItem(latestOrder.id, Number(newItem.dishId), nextQuantity);
      }

      applyOrderToDraft(latestOrder);
      setIsEditMode(false);
      setNotice({ type: 'success', message: 'Order changes saved successfully.' });
    } catch (mutationError) {
      console.error('Failed to update order:', mutationError);
      setNotice({
        type: 'error',
        message: mutationError?.message || 'Could not save your changes.',
      });
    } finally {
      setBusyAction('');
    }
  }

  function handleDiscardChanges() {
    if (!order) {
      return;
    }

    applyOrderToDraft(order);
    setNotice({ type: 'info', message: 'Unsaved changes were discarded.' });
  }

  function handleEnterEditMode() {
    setIsEditMode(true);
    setNotice(null);
  }

  function handleExitEditMode() {
    if (hasPendingChanges && order) {
      applyOrderToDraft(order);
      setNotice({ type: 'info', message: 'Exited edit mode and discarded unsaved changes.' });
    } else {
      setNotice(null);
    }

    setIsEditMode(false);
  }

  function handleAddDraftItem() {
    const selectedDish = dishById.get(String(newDishId));
    if (!selectedDish) {
      return;
    }

    const quantity = Math.max(1, Number(newDishQuantity) || 1);
    const newDraftId = `new-${localItemSeedRef.current}`;
    localItemSeedRef.current += 1;

    setItemDrafts((prev) => [
      ...prev,
      {
        id: newDraftId,
        dishId: selectedDish.id,
        name: selectedDish.name,
        price: selectedDish.price,
        quantity,
      },
    ]);
    setNewDishQuantity(1);
    setNotice({ type: 'info', message: `${selectedDish.name} added to pending changes.` });
  }

  function changeDraftItemQuantity(itemId, delta) {
    setItemDrafts((prev) => prev.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        quantity: Math.max(1, (Number(item.quantity) || 1) + delta),
      };
    }));
  }

  function removeDraftItem(itemId) {
    setItemDrafts((prev) => prev.filter((item) => item.id !== itemId));
  }

  if (loading) {
    return <LoadingState navigate={navigate} />;
  }

  if (error || !order) {
    return <ErrorState message={error} navigate={navigate} />;
  }

  const isBusy = Boolean(busyAction);

  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <section className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
                  aria-label="Back to orders"
                >
                  <ArrowLeft size={18} />
                </button>

                <div>
                  <div className="flex items-center flex-wrap gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Order #{order.id}</h1>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${getOrderStatusClass(displayStatus)}`}>
                      {getOrderStatusIcon(displayStatus)}
                      {displayStatus}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{order.displayId ? `Display ${order.displayId}` : 'No display id'}</span>
                    <span className="text-slate-300">•</span>
                    <span>{displayTag || 'No tag'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} />
                      {formatDateTime(order.createdAt)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Updated {formatDateTime(order.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PaymentBadge paymentDone={displayPaymentDone} />

                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={handleEnterEditMode}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold tracking-[0.08em] hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <PencilLine size={13} />
                    Edit Mode
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExitEditMode}
                    disabled={isBusy}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold tracking-[0.08em] hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Exit Edit
                  </button>
                )}
              </div>
            </div>

            {notice ? (
              <div
                className={`px-3.5 py-2.5 rounded-xl text-sm font-medium border ${
                  notice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : notice.type === 'info'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {notice.message}
              </div>
            ) : null}

            {isEditMode ? (
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500 mb-2">Order Tag</p>
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    placeholder="No tag"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                    disabled={isBusy}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500 mb-2">Save Controls</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="text-xs text-slate-500 font-semibold">
                      Order Status
                      <select
                        value={statusDraft}
                        onChange={(event) => setStatusDraft(event.target.value)}
                        disabled={isBusy}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-100"
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs text-slate-500 font-semibold">
                      Payment
                      <select
                        value={paymentDraft ? 'PAID' : 'PENDING'}
                        onChange={(event) => setPaymentDraft(event.target.value === 'PAID')}
                        disabled={isBusy}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-100"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isBusy || !hasPendingChanges}
                      className="h-9 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold tracking-[0.08em] hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                    >
                      {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save Changes
                    </button>

                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={isBusy || !hasPendingChanges}
                      className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold tracking-[0.08em] hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Discard
                    </button>

                    {hasPendingChanges ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        Unsaved changes
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500 mb-2">Order Tag</p>
                  <p className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center">
                    {displayTag || 'No tag'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-500 mb-2">Order State</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center justify-between">
                      <span>Status</span>
                      <span className="font-semibold">{displayStatus}</span>
                    </div>
                    <div className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center justify-between">
                      <span>Payment</span>
                      <span className="font-semibold">{displayPaymentDone ? 'PAID' : 'PENDING'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/70 bg-slate-50/70 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <UtensilsCrossed size={17} className="text-slate-500" />
                  Order Items
                </h2>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{totalItems} items</span>
              </div>

              <div className="divide-y divide-slate-100/90">
                {displayItems.length > 0 ? (
                  displayItems.map((item) => (
                    <div key={item.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                      <div className="min-w-0 flex items-center gap-3">
                        {!isEditMode ? (
                          <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-sm flex items-center justify-center">
                            {item.quantity}x
                          </div>
                        ) : null}

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatCurrency(item.price)} each
                            {isEditMode && isNewDraftItem(item) ? ' • New item' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {isEditMode ? (
                          <div className="h-9 rounded-lg border border-slate-200 bg-white inline-flex items-center">
                            <button
                              type="button"
                              className="h-full w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-40"
                              onClick={() => changeDraftItemQuantity(item.id, -1)}
                              disabled={isBusy || Number(item.quantity) <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                            <button
                              type="button"
                              className="h-full w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-40"
                              onClick={() => changeDraftItemQuantity(item.id, 1)}
                              disabled={isBusy}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : null}

                        <div className="text-right min-w-24">
                          <p className="font-bold text-slate-800 text-sm">
                            {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                          </p>
                        </div>

                        {isEditMode ? (
                          <button
                            type="button"
                            onClick={() => removeDraftItem(item.id)}
                            disabled={isBusy}
                            className="h-9 w-9 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 inline-flex items-center justify-center hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-12 text-center text-slate-500 text-sm">No items found on this order.</div>
                )}
              </div>
            </div>

            {isEditMode ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-4 sm:p-5">
                <h3 className="font-bold text-slate-800 mb-3">Add Items</h3>
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={newDishId}
                    onChange={(event) => setNewDishId(event.target.value)}
                    disabled={isBusy || dishesLoading || dishes.length === 0}
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100"
                  >
                    {Object.entries(groupedDishes).map(([category, categoryDishes]) => (
                      <optgroup key={category} label={category}>
                        {categoryDishes.map((dish) => (
                          <option key={dish.id} value={dish.id}>
                            {dish.name} - {formatCurrency(dish.price)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={newDishQuantity}
                    onChange={(event) => setNewDishQuantity(Math.max(1, Number(event.target.value) || 1))}
                    disabled={isBusy}
                    className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100"
                  />

                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    disabled={isBusy || dishes.length === 0 || !newDishId}
                    className="h-10 px-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                {dishes.length === 0 && !dishesLoading ? (
                  <p className="text-xs text-slate-500 mt-2">No dishes are available to add right now.</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(16,185,129,0.65)] overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-200/70 flex items-center gap-2 text-emerald-800 font-bold">
                <ReceiptIndianRupee size={17} />
                Payment Summary
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-emerald-900">
                  <span>Order total</span>
                  <span className="font-black text-xl tracking-tight">{formatCurrency(displayOrderTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-emerald-900">
                  <span className="inline-flex items-center gap-1.5">
                    <CreditCard size={14} />
                    Payment
                  </span>
                  <PaymentBadge paymentDone={displayPaymentDone} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/70 text-slate-800 font-bold">Order Metadata</div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-semibold text-slate-800">{order.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Display ID</span>
                  <span className="font-semibold text-slate-800">{order.displayId || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Tag</span>
                  <span className="font-semibold text-slate-800 text-right">{displayTag || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Created</span>
                  <span className="font-semibold text-slate-800 text-right">{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Updated</span>
                  <span className="font-semibold text-slate-800 text-right">{formatDateTime(order.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${getOrderStatusClass(displayStatus)}`}>
                    {getOrderStatusIcon(displayStatus)}
                    {displayStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
