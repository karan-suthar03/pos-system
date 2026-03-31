import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Hash,
  Package,
  Save,
  Search,
  Check,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { listInventoryItems, upsertInventoryItem } from '../API/inventory';

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
                    <Plus size={14} />
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

export default function AddInventoryItemPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    maxStock: '',
    initialStock: '',
  });

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const inventory = await listInventoryItems();
        if (inventory && inventory.length > 0) {
          const uniqueUnits = [...new Set(inventory.map((item) => item.unit).filter(Boolean))];
          setUnits(uniqueUnits.map((unit) => ({ value: unit, label: unit })));

          const uniqueCategories = [...new Set(inventory.map((item) => item.category).filter(Boolean))];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error loading inventory metadata:', error);
        setCategories([]);
        setUnits([]);
      }
    };

    loadData();
  }, []);

  const handleAddCategory = (newCategory) => {
    setCategories((prev) => [...prev, newCategory]);
    setFormData((prev) => ({ ...prev, category: newCategory }));
  };

  const handleAddUnit = (newUnit) => {
    const normalized = newUnit.toLowerCase();
    const newUnitObj = { value: normalized, label: newUnit };
    setUnits((prev) => [...prev, newUnitObj]);
    setFormData((prev) => ({ ...prev, unit: normalized }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ingredient name is required';
    }

    if (!formData.unit) {
      newErrors.unit = 'Unit of measure is required';
    }

    if (!formData.maxStock || parseFloat(formData.maxStock) <= 0) {
      newErrors.maxStock = 'Max stock must be greater than 0';
    }

    if (formData.initialStock && parseFloat(formData.initialStock) < 0) {
      newErrors.initialStock = 'Initial stock cannot be negative';
    }

    if (formData.initialStock && formData.maxStock &&
        parseFloat(formData.initialStock) > parseFloat(formData.maxStock)) {
      newErrors.initialStock = 'Initial stock cannot exceed max stock';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const maxStock = parseFloat(formData.maxStock);
      const initialStock = formData.initialStock ? parseFloat(formData.initialStock) : 0;
      const lowStockThreshold = maxStock > 0 ? parseFloat((maxStock * 0.25).toFixed(2)) : 0;

      const result = await upsertInventoryItem({
        name: formData.name.trim(),
        category: formData.category || null,
        unit: formData.unit,
        maxStock,
        onHand: initialStock,
        lowStockThreshold,
      });

      if (result?.id) {
        navigate(`/inventory/${result.id}`);
      } else {
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
      setErrors({ submit: 'Failed to add ingredient. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const getStockPercentage = () => {
    if (!formData.initialStock || !formData.maxStock) return 0;
    const initial = parseFloat(formData.initialStock);
    const max = parseFloat(formData.maxStock);
    return Math.min((initial / max) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventory')}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Package size={24} className="text-blue-600" />
                Add New Inventory Item
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {errors.submit && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-red-800 text-sm">Error</h3>
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6 text-slate-700">
              <Box size={20} />
              <h3 className="font-bold text-lg">Basic Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Ingredient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Tomatoes, Olive Oil"
                  className={`w-full p-3 bg-slate-50 border rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                <SearchableDropdown
                  options={categories}
                  value={formData.category}
                  onChange={(val) => handleChange('category', val)}
                  placeholder="Select category..."
                  allowAdd={true}
                  onAddNew={handleAddCategory}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Unit of Measure <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={units}
                  value={formData.unit}
                  onChange={(val) => handleChange('unit', val)}
                  placeholder="Select unit..."
                  labelKey="label"
                  valueKey="value"
                  allowAdd={true}
                  onAddNew={handleAddUnit}
                />
                {errors.unit && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.unit}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6 text-slate-700">
              <Hash size={20} />
              <h3 className="font-bold text-lg">Stock Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Maximum Stock Capacity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxStock}
                    onChange={(e) => handleChange('maxStock', e.target.value)}
                    placeholder="0.00"
                    className={`w-full p-3 pr-16 bg-slate-50 border rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.maxStock ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {formData.unit && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {formData.unit}
                    </span>
                  )}
                </div>
                {errors.maxStock && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.maxStock}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Initial Stock Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.initialStock}
                    onChange={(e) => handleChange('initialStock', e.target.value)}
                    placeholder="0.00"
                    className={`w-full p-3 pr-16 bg-slate-50 border rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.initialStock ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {formData.unit && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {formData.unit}
                    </span>
                  )}
                </div>
                {errors.initialStock && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.initialStock}
                  </p>
                )}
              </div>
            </div>

            {formData.maxStock && parseFloat(formData.maxStock) > 0 && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Stock Preview</span>
                  <span className="text-sm font-bold text-slate-700">
                    {formData.initialStock || 0} / {formData.maxStock} {formData.unit}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${getStockPercentage()}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Alert threshold will be set at{' '}
                  <span className="font-bold text-rose-600">
                    {(parseFloat(formData.maxStock) * 0.25).toFixed(2)} {formData.unit}
                  </span>
                  {' '} (25% of max capacity)
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="flex-1 py-3 px-6 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Add Ingredient
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
