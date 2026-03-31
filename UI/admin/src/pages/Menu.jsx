import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  IndianRupee,
  Layers,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteDish, getDishList, setDishAvailability } from '../API/dishes.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';

function formatPrice(paise) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

function formatUpdatedAt(timestamp) {
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

function AvailabilityBadge({ isAvailable }) {
  const className = isAvailable
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${className}`}>
      {isAvailable ? <CheckCircle2 size={12} strokeWidth={3} /> : <XCircle size={12} strokeWidth={3} />}
      {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
    </span>
  );
}

export default function Menu() {
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadMenuItems() {
      setLoading(true);
      setError('');

      try {
        const dishList = await getDishList();
        if (!isActive) {
          return;
        }

        const sorted = Array.isArray(dishList)
          ? [...dishList].sort((left, right) => {
              const categoryCompare = left.category.localeCompare(right.category);
              if (categoryCompare !== 0) {
                return categoryCompare;
              }
              return left.name.localeCompare(right.name);
            })
          : [];

        setItems(sorted);
      } catch (loadError) {
        console.error('Failed to load menu items:', loadError);
        if (isActive) {
          setItems([]);
          setError('Could not load menu items. Please try again.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadMenuItems();

    return () => {
      isActive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const unique = new Set();
    items.forEach((item) => {
      if (item.category) {
        unique.add(item.category);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      if (availabilityFilter === 'available' && !item.isAvailable) {
        return false;
      }

      if (availabilityFilter === 'unavailable' && item.isAvailable) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchText = `${item.name} ${item.category}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [items, searchQuery, categoryFilter, availabilityFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map();
    filteredItems.forEach((item) => {
      const key = item.category || 'Other';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, groupItems]) => ({
        category,
        items: groupItems.sort((left, right) => left.name.localeCompare(right.name)),
      }));
  }, [filteredItems]);

  const handleToggleAvailability = async (item) => {
    if (!item || busyId) {
      return;
    }

    const nextAvailability = item.isAvailable ? 'unavailable' : 'available';
    const confirmed = await confirm({
      title: 'Change availability',
      message: `Mark ${item.name} as ${nextAvailability}?`,
      confirmText: 'Yes, change',
      tone: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setBusyId(item.id);
    setNotice(null);

    try {
      const updated = await setDishAvailability(item.id, !item.isAvailable);
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
    } catch (toggleError) {
      console.error('Failed to update availability:', toggleError);
      setNotice({
        type: 'error',
        message: 'Could not update availability. Please try again.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!item) {
      return;
    }

    const confirmed = await confirm({
      title: 'Delete menu item',
      message: `Delete ${item.name}? This action cannot be undone.`,
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setBusyId(item.id);
    setNotice(null);

    try {
      await deleteDish(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (deleteError) {
      console.error('Failed to delete menu item:', deleteError);
      setNotice({
        type: 'error',
        message: 'Could not delete item. Please try again.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Management</p>
            <h1 className="text-2xl font-bold text-slate-800 font-display">Menu Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage dishes, availability, and pricing in one view.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/menu/item/new')}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-slate-900 text-white font-semibold shadow-[0_12px_24px_-18px_rgba(15,23,42,0.8)] hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.45)] p-4 sm:p-5">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
            <label className="relative w-full xl:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search dishes or categories"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-200"
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white h-11 px-3 text-sm text-slate-600">
                <Layers size={16} className="text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="bg-transparent outline-none text-sm font-semibold text-slate-700"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white h-11 px-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'available', label: 'Available' },
                  { key: 'unavailable', label: 'Unavailable' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAvailabilityFilter(option.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      availabilityFilter === option.key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              notice.type === 'error'
                ? 'border-rose-200 bg-rose-50/80 text-rose-700'
                : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
            }`}
          >
            {notice.message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-10 text-center shadow-[0_18px_35px_-30px_rgba(15,23,42,0.45)]">
            <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800">Loading menu items</h2>
            <p className="text-sm text-slate-500 mt-1">Syncing the latest dishes from your database.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-6 text-rose-700">
                {error}
              </div>
            )}

            {groupedItems.map((group) => (
              <div key={group.category} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <div className="p-1.5 bg-slate-200/50 rounded text-slate-600">
                    <Layers size={16} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-700">{group.category}</h2>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                    {group.items.length} item{group.items.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.45)] overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Dish</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Availability</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Updated</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                                <UtensilsCrossed size={16} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{item.name}</div>
                                <div className="text-xs text-slate-400">#{item.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center text-sm font-bold text-slate-700">
                              <IndianRupee size={14} className="text-slate-400 mr-1" />
                              {formatPrice(item.price)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleAvailability(item)}
                              disabled={busyId === item.id}
                              className="group inline-flex items-center gap-2"
                            >
                              <AvailabilityBadge isAvailable={item.isAvailable} />
                              <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-500" />
                            </button>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">
                            {formatUpdatedAt(item.updatedAt)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/menu/item/${item.id}`)}
                                className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50/70 transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/70 transition-colors"
                                title="Delete"
                                disabled={busyId === item.id}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {groupedItems.length === 0 && !error && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/78 p-10 text-center shadow-[0_18px_35px_-30px_rgba(15,23,42,0.45)]">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center mb-4">
                  <UtensilsCrossed size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No menu items found</h3>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or add a new dish.</p>
                <button
                  type="button"
                  onClick={() => navigate('/menu/item/new')}
                  className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
