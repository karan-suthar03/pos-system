import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Package,
  Save,
  Search,
  Settings,
  Scale,
  X,
} from 'lucide-react';
import {
  adjustInventoryStock,
  getInventoryItem,
  listInventoryItems,
  listInventoryMovements,
  upsertInventoryItem,
} from '../API/inventory';
import { formatRelativeTime } from '../utils/time';

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  labelKey = 'name',
  valueKey = 'id',
  subLabelKey = null,
  allowAdd = false,
  onAddNew = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) => {
    const label = typeof option === 'string' ? option : option[labelKey];
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedObj = options.find((option) => {
    const val = typeof option === 'string' ? option : option[valueKey];
    return val === value;
  });

  const getDisplayLabel = (option) => typeof option === 'string' ? option : option[labelKey];

  const handleAddNew = () => {
    if (searchTerm.trim() && onAddNew) {
      onAddNew(searchTerm.trim());
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  const isSearchTermNew = searchTerm.trim() && !filteredOptions.some((option) => {
    const label = typeof option === 'string' ? option : option[labelKey];
    return label.toLowerCase() === searchTerm.toLowerCase();
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-lg cursor-pointer transition-all ${
          isOpen ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`text-sm ${selectedObj ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {selectedObj ? getDisplayLabel(selectedObj) : placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden left-0">
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-slate-500 placeholder-slate-400"
                placeholder="Search or type to add..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 && !isSearchTermNew ? (
              <div className="p-3 text-sm text-slate-400 text-center">No results found</div>
            ) : (
              <>
                {filteredOptions.map((option, index) => {
                  const optionValue = typeof option === 'string' ? option : option[valueKey];
                  const optionLabel = typeof option === 'string' ? option : option[labelKey];
                  const optionSubLabel = subLabelKey && typeof option !== 'string' ? option[subLabelKey] : null;
                  const isSelected = optionValue === value;

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        onChange(optionValue);
                        setIsOpen(false);
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                        isSelected ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{optionLabel}</span>
                        {optionSubLabel && <span className="text-xs text-slate-400">{optionSubLabel}</span>}
                      </div>
                      {isSelected && <Check size={14} />}
                    </div>
                  );
                })}
                {allowAdd && isSearchTermNew && (
                  <div
                    onClick={handleAddNew}
                    className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-blue-50 border-t border-slate-100 text-blue-600 font-medium"
                  >
                    <Check size={14} />
                    <span>Add "{searchTerm}"</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function InventoryItemDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [stockMode, setStockMode] = useState('add');
  const [stockInput, setStockInput] = useState('');

  const [formData, setFormData] = useState({});
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState('');

  const loadMovements = async ({ silent = false } = {}) => {
    if (!id) {
      return;
    }

    if (!silent) {
      setMovementsLoading(true);
    }
    setMovementsError('');

    try {
      const data = await listInventoryMovements({ itemId: id, limit: 20 });
      setMovements(data || []);
    } catch (error) {
      console.error('Failed to load movements:', error);
      setMovementsError('Failed to load movement history.');
    } finally {
      if (!silent) {
        setMovementsLoading(false);
      }
    }
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const inventory = await listInventoryItems();
        const uniqueCategories = [...new Set(inventory.map((entry) => entry.category).filter(Boolean))];
        setCategories(uniqueCategories);

        const uniqueUnits = [...new Set(inventory.map((entry) => entry.unit).filter(Boolean))];
        setUnits(uniqueUnits.map((unit) => ({ value: unit, label: unit })));
      } catch (error) {
        console.error('Error fetching metadata', error);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      try {
        const details = await getInventoryItem(id);
        setItem(details);
        setFormData(details);
        if (details.category && !categories.includes(details.category)) {
          setCategories((prev) => [...prev, details.category]);
        }
      } catch (error) {
        console.error('Error fetching item details', error);
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id]);

  useEffect(() => {
    loadMovements();
  }, [id]);

  const handleAddNewCategory = (newCategory) => {
    if (!categories.includes(newCategory)) {
      setCategories((prev) => [...prev, newCategory]);
    }
    setFormData((prev) => ({ ...prev, category: newCategory }));
  };

  const handleAddNewUnit = (newUnit) => {
    const normalized = newUnit.toLowerCase();
    const newUnitObj = { value: normalized, label: newUnit };
    if (!units.find((unit) => unit.value === normalized)) {
      setUnits((prev) => [...prev, newUnitObj]);
    }
    setFormData((prev) => ({ ...prev, unit: normalized }));
  };

  const handleStockSubmit = async (event) => {
    event.preventDefault();
    const value = parseFloat(stockInput);
    if (Number.isNaN(value)) return;

    const newAmount = stockMode === 'add' ? item.onHand + value : value;
    const delta = newAmount - item.onHand;

    try {
      await adjustInventoryStock(item.id, delta, stockMode === 'add' ? 'Manual add' : 'Manual set');
      const updatedItem = {
        ...item,
        onHand: parseFloat(newAmount.toFixed(2)),
        updatedAt: Date.now(),
      };
      setItem(updatedItem);
      setFormData(updatedItem);
      setStockInput('');
      loadMovements({ silent: true });
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock');
    }
  };

  const handleDetailsUpdate = async (event) => {
    event.preventDefault();
    try {
      const updated = await upsertInventoryItem({
        id: item.id,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        maxStock: formData.maxStock,
        lowStockThreshold: formData.lowStockThreshold,
      });
      setItem(updated);
      setFormData(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating details:', error);
      alert('Failed to update details');
    }
  };

  const getPercentage = (current, max) => {
    if (max <= 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getStatusColor = (current, max, threshold) => {
    if (current <= threshold) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (max > 0 && (current / max) < 0.5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading item details...</div>;
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-slate-800">Item Not Found</h2>
        <button onClick={() => navigate('/inventory')} className="mt-4 text-blue-600 font-bold">Return to Inventory</button>
      </div>
    );
  }

  const percentage = getPercentage(item.onHand, item.maxStock);
  const statusClasses = getStatusColor(item.onHand, item.maxStock, item.lowStockThreshold);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/inventory')}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  {item.name}
                  {item.category && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                      {item.category}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isEditing ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isEditing ? <X size={16} /> : <Settings size={16} />}
              {isEditing ? 'Cancel Edit' : 'Edit Details'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {isEditing && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <Edit3 size={20} />
              <h3 className="font-bold text-lg">Edit Configuration</h3>
            </div>
            <form onSubmit={handleDetailsUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <SearchableDropdown
                  options={categories}
                  value={formData.category}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                  placeholder="Select a category"
                  allowAdd={true}
                  onAddNew={handleAddNewCategory}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Capacity</label>
                  <input
                    type="number"
                    value={formData.maxStock ?? ''}
                    onChange={(e) => setFormData({ ...formData, maxStock: parseFloat(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alert Threshold</label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold ?? ''}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseFloat(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit of Measure</label>
                <SearchableDropdown
                  options={units}
                  value={formData.unit}
                  onChange={(val) => setFormData({ ...formData, unit: val })}
                  placeholder="Select unit..."
                  labelKey="label"
                  valueKey="value"
                  allowAdd={true}
                  onAddNew={handleAddNewUnit}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-lg text-slate-500 font-bold hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2">
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">Current Stock Level</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-800">{item.onHand}</span>
                    <span className="text-lg font-bold text-slate-400">{item.unit}</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${statusClasses}`}>
                  {item.onHand <= item.lowStockThreshold ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                  <span className="font-bold text-sm">
                    {item.onHand <= item.lowStockThreshold ? 'Low Stock Alert' : 'Stock Healthy'}
                  </span>
                </div>
              </div>

              <div className="relative pt-2 pb-6">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>0 {item.unit}</span>
                  <span>50%</span>
                  <span>Max: {item.maxStock || '--'} {item.unit}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      item.onHand <= item.lowStockThreshold ? 'bg-rose-500' : (percentage < 50 ? 'bg-amber-500' : 'bg-emerald-500')
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Max Capacity</p>
                  <p className="font-bold text-slate-700">{item.maxStock || '--'} {item.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Reorder Point</p>
                  <p className="font-bold text-rose-600">{item.lowStockThreshold} {item.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Unit</p>
                  <p className="font-bold text-slate-700">{item.unit}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Movement history</p>
                  <p className="text-xs text-slate-500 mt-1">Latest adjustments and usage logs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/movements')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  View all
                </button>
              </div>

              {movementsError && (
                <div className="rounded-lg border border-rose-200/70 bg-rose-50/80 p-3 text-xs font-semibold text-rose-700 mb-3">
                  {movementsError}
                </div>
              )}

              {movementsLoading ? (
                <div className="text-sm text-slate-500">Loading history...</div>
              ) : movements.length === 0 ? (
                <div className="text-sm text-slate-500">No movements recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {movements.map((movement) => {
                    const delta = Number(movement.delta);
                    const isPositive = Number.isFinite(delta) && delta > 0;
                    const isNegative = Number.isFinite(delta) && delta < 0;
                    const deltaLabel = Number.isFinite(delta)
                      ? `${isPositive ? '+' : ''}${delta.toFixed(2)}`
                      : '--';
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
                        className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                      >
                        <div className="min-w-[200px]">
                          <p className="text-sm font-semibold text-slate-800">
                            {movement.reason || 'Adjustment'}
                          </p>
                          {movement.notes && (
                            <p className="text-xs text-slate-500 mt-1">{movement.notes}</p>
                          )}
                          {(movement.refType || movement.refId) && (
                            <p className="text-xs text-slate-400 mt-1">
                              Ref: {movement.refType || 'Item'} {movement.refId || ''}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${deltaClass}`}>
                            {deltaLabel} {item.unit}
                          </span>
                          <div
                            className="text-xs text-slate-400 mt-2"
                            title={createdAtTitle}
                          >
                            {createdAtLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                Update Stock
              </h3>

              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setStockMode('add')}
                  className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    stockMode === 'add' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'
                  }`}
                >
                  Add
                </button>
                <button
                  onClick={() => setStockMode('set')}
                  className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    stockMode === 'set' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'
                  }`}
                >
                  <Scale size={14} /> Set
                </button>
              </div>

              <form onSubmit={handleStockSubmit}>
                <div className="relative mb-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{item.unit}</span>
                </div>

                {stockInput && (
                  <div className="flex justify-between items-center px-2 mb-4 text-xs">
                    <span className="text-slate-400">Resulting Stock:</span>
                    <span className="font-bold text-slate-800">
                      {stockMode === 'add'
                        ? (item.onHand + parseFloat(stockInput)).toFixed(2)
                        : parseFloat(stockInput).toFixed(2)} {item.unit}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!stockInput}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {stockMode === 'add' ? 'Confirm Restock' : 'Update Inventory'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
