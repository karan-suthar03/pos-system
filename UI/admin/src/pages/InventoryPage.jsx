import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Layers,
  LayoutList,
  Package,
  Plus,
  RefreshCcw,
  Search,
  X,
  Save,
} from 'lucide-react';
import { adjustInventoryStock, listInventoryItems } from '../API/inventory';
import { formatRelativeTime } from '../utils/time';

export default function InventoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState('flat');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [isRefillOpen, setIsRefillOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [refillAmount, setRefillAmount] = useState('');
  const [updateMode, setUpdateMode] = useState('add');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listInventoryItems();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isLowStock = item.onHand <= item.lowStockThreshold;

      let matchesFilter = true;
      if (filterStatus === 'Low Stock') matchesFilter = isLowStock;
      if (filterStatus === 'In Stock') matchesFilter = !isLowStock;

      return matchesSearch && matchesFilter;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue;
        let bValue;

        if (sortConfig.key === 'percentage') {
          const aMax = a.maxStock > 0 ? a.maxStock : Math.max(a.lowStockThreshold, 1);
          const bMax = b.maxStock > 0 ? b.maxStock : Math.max(b.lowStockThreshold, 1);
          aValue = aMax > 0 ? a.onHand / aMax : 0;
          bValue = bMax > 0 ? b.onHand / bMax : 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, searchQuery, filterStatus, sortConfig]);

  const groupedItems = useMemo(() => {
    if (viewMode !== 'grouped') return null;

    const groups = {};
    processedItems.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  }, [processedItems, viewMode]);

  const totalItems = items.length;
  const lowStockCount = items.filter((item) => item.onHand <= item.lowStockThreshold).length;

  const handleRowClick = (item) => {
    navigate(`/inventory/${item.id}`);
  };

  const openRefillModal = (event, item) => {
    event.stopPropagation();
    setSelectedItem(item);
    setRefillAmount('');
    setUpdateMode('add');
    setIsRefillOpen(true);
  };

  const handleRefillSubmit = async (event) => {
    event.preventDefault();
    if (!selectedItem || !refillAmount) return;

    const inputVal = parseFloat(refillAmount);
    if (Number.isNaN(inputVal)) return;

    try {
      const newAmount = updateMode === 'add'
        ? selectedItem.onHand + inputVal
        : inputVal;
      const delta = newAmount - selectedItem.onHand;

      await adjustInventoryStock(selectedItem.id, delta, updateMode === 'add' ? 'Manual add' : 'Manual set');

      setItems((prev) => prev.map((item) => {
        if (item.id === selectedItem.id) {
          return {
            ...item,
            onHand: parseFloat(newAmount.toFixed(2)),
            updatedAt: Date.now(),
          };
        }
        return item;
      }));

      setIsRefillOpen(false);
    } catch (err) {
      console.error('Failed to update stock:', err);
      alert('Failed to update stock. Please try again.');
    }
  };

  const getProgressColor = (current, max, threshold) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    if (current <= threshold) return 'bg-rose-500';
    if (percentage < 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const TableHeader = () => (
    <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
      <tr>
        <th
          onClick={() => handleSort('name')}
          className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-2">
            Ingredient Name
            {sortConfig.key === 'name'
              ? (sortConfig.direction === 'asc'
                ? <ArrowUp size={14} className="text-blue-600" />
                : <ArrowDown size={14} className="text-blue-600" />)
              : <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-500" />}
          </div>
        </th>
        {viewMode !== 'grouped' && (
          <th
            onClick={() => handleSort('category')}
            className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2">
              Category
              {sortConfig.key === 'category'
                ? (sortConfig.direction === 'asc'
                  ? <ArrowUp size={14} className="text-blue-600" />
                  : <ArrowDown size={14} className="text-blue-600" />)
                : <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-500" />}
            </div>
          </th>
        )}
        <th
          onClick={() => handleSort('percentage')}
          className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3 cursor-pointer hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-2">
            Stock Level
            {sortConfig.key === 'percentage'
              ? (sortConfig.direction === 'asc'
                ? <ArrowUp size={14} className="text-blue-600" />
                : <ArrowDown size={14} className="text-blue-600" />)
              : <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-500" />}
          </div>
        </th>
        <th
          onClick={() => handleSort('onHand')}
          className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
        >
          <div className="flex items-center gap-2">
            Quantity
            {sortConfig.key === 'onHand'
              ? (sortConfig.direction === 'asc'
                ? <ArrowUp size={14} className="text-blue-600" />
                : <ArrowDown size={14} className="text-blue-600" />)
              : <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-500" />}
          </div>
        </th>
        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Updated</th>
        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
      </tr>
    </thead>
  );

  const renderRow = (item) => {
    const maxValue = item.maxStock > 0 ? item.maxStock : Math.max(item.lowStockThreshold, 1);
    const percentage = maxValue > 0 ? Math.min((item.onHand / maxValue) * 100, 100) : 0;

    return (
      <tr
        key={item.id}
        onClick={() => handleRowClick(item)}
        className="hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.onHand <= item.lowStockThreshold ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {item.onHand <= item.lowStockThreshold ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div>
              <div className="font-bold text-slate-800">{item.name}</div>
              <div className="text-xs text-slate-500">Unit: {item.unit}</div>
            </div>
          </div>
        </td>
        {viewMode !== 'grouped' && (
          <td className="px-6 py-4 text-sm text-slate-600 font-semibold">
            {item.category || 'Uncategorized'}
          </td>
        )}
        <td className="px-6 py-4">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getProgressColor(item.onHand, maxValue, item.lowStockThreshold)}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {item.onHand.toFixed(2)} / {item.maxStock > 0 ? item.maxStock.toFixed(2) : '--'} {item.unit}
          </div>
        </td>
        <td className="px-6 py-4 text-sm font-bold text-slate-800">
          {item.onHand.toFixed(2)} {item.unit}
        </td>
        <td className="px-6 py-4 text-xs text-slate-500">
          {formatRelativeTime(item.updatedAt)}
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={(event) => openRefillModal(event, item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={14} />
            Update
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-20 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Package size={22} className="text-amber-600" />
                Inventory Overview
              </h1>
              <p className="text-sm text-slate-500 mt-1">Track ingredient stock levels and warnings.</p>
            </div>
            <button
              onClick={() => navigate('/inventory/add')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search ingredients..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600"
            >
              <option value="All">All Items</option>
              <option value="Low Stock">Low Stock</option>
              <option value="In Stock">In Stock</option>
            </select>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${viewMode === 'flat' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                <LayoutList size={14} />
                Flat
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${viewMode === 'grouped' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                <Layers size={14} />
                Grouped
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="text-xs text-slate-500 font-bold uppercase">Total Items</div>
            <div className="text-lg font-black text-slate-800">{totalItems}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="text-xs text-slate-500 font-bold uppercase">Low Stock</div>
            <div className="text-lg font-black text-rose-600">{lowStockCount}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-20">Loading inventory...</div>
        ) : error ? (
          <div className="text-center text-rose-600 py-20">{error}</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {viewMode === 'grouped' && groupedItems ? (
              Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category} className="border-b border-slate-200 last:border-b-0">
                  <div className="px-6 py-3 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {category}
                  </div>
                  <table className="w-full">
                    <TableHeader />
                    <tbody>{categoryItems.map(renderRow)}</tbody>
                  </table>
                </div>
              ))
            ) : (
              <table className="w-full">
                <TableHeader />
                <tbody>{processedItems.map(renderRow)}</tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {isRefillOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Update Stock</h3>
              <button
                onClick={() => setIsRefillOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRefillSubmit} className="p-5 space-y-4">
              <div className="text-sm font-bold text-slate-700">{selectedItem.name}</div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUpdateMode('add')}
                  className={`flex-1 py-2 rounded text-xs font-bold ${updateMode === 'add' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateMode('set')}
                  className={`flex-1 py-2 rounded text-xs font-bold ${updateMode === 'set' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                >
                  Set
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={refillAmount}
                  onChange={(event) => setRefillAmount(event.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {selectedItem.unit}
                </span>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Confirm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
