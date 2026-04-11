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
import {
  connectPrinter,
  connectPrinterToTarget,
  getStatus as getPrinterStatus,
  listPrinters,
  printOrder,
} from './API/printer';
import { getServerStatus } from './API/serverStatus';
import { useDrafts } from './hooks/useDrafts';

const KOT_PRINTER_KEY = 'counter_kot_printer_address';
const RECEIPT_PRINTER_KEY = 'counter_receipt_printer_address';
const SINGLE_PRINTER_MODE_KEY = 'counter_single_printer_mode';

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
  const [printerStatus, setPrinterStatus] = useState({
    bluetoothEnabled: false,
    printerConnected: false,
    printerName: 'No printer',
    printers: [],
  });
  const [printNotice, setPrintNotice] = useState('');
  const [kotPrinterAddress, setKotPrinterAddress] = useState(() => localStorage.getItem(KOT_PRINTER_KEY) || '');
  const [receiptPrinterAddress, setReceiptPrinterAddress] = useState(() => localStorage.getItem(RECEIPT_PRINTER_KEY) || '');
  const [singlePrinterMode, setSinglePrinterMode] = useState(() => localStorage.getItem(SINGLE_PRINTER_MODE_KEY) !== 'false');
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

    const refreshPrinterStatus = async () => {
      try {
        const status = await getPrinterStatus();
        if (!active) {
          return;
        }

        setPrinterStatus({
          bluetoothEnabled: Boolean(status?.bluetoothEnabled),
          printerConnected: Boolean(status?.printerConnected),
          printerName: status?.printerName || 'No printer',
          printers: Array.isArray(status?.printers) ? status.printers : [],
        });

        if (status?.bluetoothEnabled && !status?.printerConnected) {
          const connected = await connectPrinter();
          if (!active) {
            return;
          }
          setPrinterStatus((current) => ({
            ...current,
            printerConnected: Boolean(connected?.connected),
            printerName: connected?.printerName || current.printerName,
            printers: Array.isArray(connected?.printers) ? connected.printers : current.printers,
          }));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setPrinterStatus((current) => ({
          ...current,
          printerConnected: false,
        }));
      }
    };

    refreshPrinterStatus();
    const intervalId = window.setInterval(refreshPrinterStatus, 8000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshPrinterList = async () => {
      try {
        const printers = await listPrinters();
        if (!active) {
          return;
        }
        setPrinterStatus((current) => ({
          ...current,
          printers: Array.isArray(printers) ? printers : current.printers,
        }));
      } catch (_error) {
        // Keep last known list if discovery fails.
      }
    };

    refreshPrinterList();
    const intervalId = window.setInterval(refreshPrinterList, 12000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
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

  useEffect(() => {
    localStorage.setItem(KOT_PRINTER_KEY, kotPrinterAddress || '');
  }, [kotPrinterAddress]);

  useEffect(() => {
    localStorage.setItem(RECEIPT_PRINTER_KEY, receiptPrinterAddress || '');
  }, [receiptPrinterAddress]);

  useEffect(() => {
    localStorage.setItem(SINGLE_PRINTER_MODE_KEY, String(singlePrinterMode));
  }, [singlePrinterMode]);

  useEffect(() => {
    if (!printNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPrintNotice('');
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [printNotice]);

  useEffect(() => {
    const printers = Array.isArray(printerStatus.printers) ? printerStatus.printers : [];
    if (printers.length === 0) {
      return;
    }

    const hasKot = kotPrinterAddress && printers.some((printer) => printer.address === kotPrinterAddress);
    if (!hasKot) {
      setKotPrinterAddress(printers[0].address || '');
    }

    // Keep empty receipt address as an explicit "Skip Receipt" choice.
    const hasReceipt =
      receiptPrinterAddress === '' || printers.some((printer) => printer.address === receiptPrinterAddress);
    if (!hasReceipt) {
      const fallback = printers.length > 1 ? printers[1].address : '';
      setReceiptPrinterAddress(fallback);
    }
  }, [printerStatus.printers, kotPrinterAddress, receiptPrinterAddress]);

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

  async function handlePrintOrder(order) {
    if (!order?.id) {
      return;
    }

    try {
      const status = await getPrinterStatus();
      const printers = Array.isArray(status?.printers) ? status.printers : [];
      if (printers.length === 0) {
        throw new Error('No paired printer found');
      }

      const fallbackKotAddress = printers[0]?.address || '';
      const targetKotAddress = kotPrinterAddress || fallbackKotAddress;
      const targetKot = printers.find((printer) => printer.address === targetKotAddress) || printers[0];
      if (!targetKot?.address) {
        throw new Error('No valid KOT printer selected');
      }

      if (status?.bluetoothEnabled && !status?.printerConnected) {
        await connectPrinterToTarget({
          printerName: targetKot.name,
          printerAddress: targetKot.address,
        });
      }
      await printOrder(order.id, 'KOT', order, {
        targetPrinterName: targetKot.name,
        targetPrinterAddress: targetKot.address,
      });

      const targetReceipt = printers.find((printer) => printer.address === receiptPrinterAddress);
      const shouldPrintReceipt = !singlePrinterMode && printers.length > 1 && targetReceipt?.address;
      if (shouldPrintReceipt) {
        await connectPrinterToTarget({
          printerName: targetReceipt.name,
          printerAddress: targetReceipt.address,
        });
        await printOrder(order.id, 'RECEIPT', order, {
          targetPrinterName: targetReceipt.name,
          targetPrinterAddress: targetReceipt.address,
        });
        setPrintNotice('Printed KOT and receipt.');
      } else if (singlePrinterMode) {
        setPrintNotice('Printed KOT only (KOT-only mode).');
      } else if (printers.length <= 1) {
        setPrintNotice('Printed KOT only (single printer mode).');
      } else {
        setPrintNotice('Printed KOT only (receipt printer not selected).');
      }

      const latestStatus = await getPrinterStatus();
      setPrinterStatus({
        bluetoothEnabled: Boolean(latestStatus?.bluetoothEnabled),
        printerConnected: Boolean(latestStatus?.printerConnected),
        printerName: latestStatus?.printerName || 'No printer',
        printers: Array.isArray(latestStatus?.printers) ? latestStatus.printers : [],
      });
    } catch (error) {
      console.error('Failed to print order:', error);
    }
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
        bluetoothEnabled={printerStatus.bluetoothEnabled}
        printerConnected={printerStatus.printerConnected}
        printerName={printerStatus.printerName}
        printers={printerStatus.printers}
        kotPrinterAddress={kotPrinterAddress}
        receiptPrinterAddress={receiptPrinterAddress}
        onKotPrinterChange={setKotPrinterAddress}
        onReceiptPrinterChange={setReceiptPrinterAddress}
        singlePrinterMode={singlePrinterMode}
        onSinglePrinterModeChange={setSinglePrinterMode}
        printNotice={printNotice}
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
          onPrintOrder={handlePrintOrder}
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