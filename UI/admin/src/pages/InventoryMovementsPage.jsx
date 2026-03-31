import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Search, Activity } from 'lucide-react';
import { listInventoryItems, listInventoryMovements } from '../API/inventory';
import { formatRelativeTime } from '../utils/time';

function formatDelta(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '--';
  }
  return `${parsed > 0 ? '+' : ''}${parsed.toFixed(2)}`;
}

export default function InventoryMovementsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('all');

  const itemMap = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [items]);

  const loadMovements = async () => {
    setLoading(true);
    setError('');

    try {
      const [itemsData, movementData] = await Promise.all([
        listInventoryItems(),
        listInventoryMovements({ limit: 250 }),
      ]);
      setItems(itemsData || []);
      setMovements(movementData || []);
    } catch (loadError) {
      console.error('Failed to load movements:', loadError);
      setError('Failed to load inventory movements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const filteredMovements = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    let results = [...movements];

    if (selectedItemId !== 'all') {
      const idValue = Number(selectedItemId);
      results = results.filter((movement) => movement.inventoryItemId === idValue);
    }

    if (normalizedQuery) {
      results = results.filter((movement) => {
        const itemName = itemMap[movement.inventoryItemId]?.name ?? '';
        const haystack = [
          itemName,
          movement.reason,
          movement.notes,
          movement.refType,
          movement.refId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }

    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return results;
  }, [itemMap, movements, searchQuery, selectedItemId]);

  return (
    <div className="min-h-screen bg-slate-50/30 pb-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">
              Inventory
            </p>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-slate-600" />
              Movement history
            </h1>
            <p className="text-sm text-slate-500 mt-1">Track deductions, restocks, and adjustments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to inventory
            </button>
            <button
              type="button"
              onClick={loadMovements}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl p-4 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]">
          <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by item, reason, or note"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              <option value="all">All items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="text-xs font-semibold text-slate-500 text-right">
              Showing {filteredMovements.length} movements
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.4)] overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200/70 bg-slate-50/80">
            <div>Item</div>
            <div>Delta</div>
            <div>Reason</div>
            <div>Ref</div>
            <div>Time</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading movements...</div>
          ) : filteredMovements.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No movement history found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMovements.map((movement) => {
                const item = itemMap[movement.inventoryItemId];
                const delta = Number(movement.delta);
                const isPositive = Number.isFinite(delta) && delta > 0;
                const isNegative = Number.isFinite(delta) && delta < 0;
                const deltaClass = isPositive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : isNegative
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600';
                const createdAtLabel = formatRelativeTime(movement.createdAt);
                const createdAtTitle = movement.createdAt
                  ? new Date(movement.createdAt).toLocaleString()
                  : '';

                return (
                  <div
                    key={movement.id}
                    className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_1fr_1fr] px-5 py-4 text-sm"
                  >
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold md:hidden mb-1">
                        Item
                      </div>
                      <div className="font-semibold text-slate-800">
                        {item?.name || 'Unknown item'}
                      </div>
                      {item?.category && (
                        <div className="text-xs text-slate-400 mt-1">{item.category}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold md:hidden mb-1">
                        Delta
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${deltaClass}`}>
                        {formatDelta(movement.delta)} {item?.unit || ''}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold md:hidden mb-1">
                        Reason
                      </div>
                      <div className="font-semibold text-slate-700">
                        {movement.reason || 'Adjustment'}
                      </div>
                      {movement.notes && (
                        <div className="text-xs text-slate-500 mt-1">{movement.notes}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold md:hidden mb-1">
                        Ref
                      </div>
                      <div className="text-sm text-slate-600">
                        {movement.refType || movement.refId ? `${movement.refType || 'Ref'} ${movement.refId || ''}` : '--'}
                      </div>
                    </div>

                    <div title={createdAtTitle}>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold md:hidden mb-1">
                        Time
                      </div>
                      <div className="text-sm text-slate-600">{createdAtLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
