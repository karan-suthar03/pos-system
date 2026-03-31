import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChefHat,
  IndianRupee,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  createDish,
  deleteDish,
  getDishById,
  getDishList,
  updateDish,
} from '../API/dishes.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';

const emptyForm = {
  name: '',
  category: '',
  price: '',
  isAvailable: true,
};

function toPriceInput(price) {
  if (!Number.isFinite(price) || price < 0) {
    return '';
  }

  return (price / 100).toFixed(2);
}

function normalizePriceInput(value) {
  const normalized = String(value || '').replace(/[^0-9.]/g, '');
  if (!normalized) {
    return { raw: '', value: null };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { raw: normalized, value: null };
  }

  return { raw: normalized, value: parsed };
}

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  allowAdd = false,
  onAddNew,
}) {
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

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return options;
    }

    return options.filter((opt) => opt.toLowerCase().includes(normalizedSearch));
  }, [options, searchTerm]);

  const handleAdd = () => {
    if (!allowAdd || !onAddNew) {
      return;
    }

    const cleaned = searchTerm.trim();
    if (!cleaned) {
      return;
    }

    onAddNew(cleaned);
    setSearchTerm('');
    setIsOpen(false);
  };

  const showAddNew = allowAdd && searchTerm.trim() && !options.some(
    (opt) => opt.toLowerCase() === searchTerm.trim().toLowerCase()
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearchTerm('');
        }}
        className={`w-full flex items-center justify-between h-11 px-3 rounded-xl border text-sm font-semibold transition-all ${
          isOpen
            ? 'border-amber-200 bg-amber-50/60 text-slate-800'
            : 'border-slate-200 bg-white text-slate-500'
        }`}
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-40 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.5)] overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <input
              type="text"
              autoFocus
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Search or type to add"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 && !showAddNew && (
              <div className="p-3 text-sm text-slate-400 text-center">No results found</div>
            )}

            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                  opt === value ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600'
                }`}
              >
                <span>{opt}</span>
                {opt === value && <Check size={14} />}
              </button>
            ))}

            {showAddNew && (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 border-t border-slate-100 text-amber-700 hover:bg-amber-50"
              >
                <Plus size={14} />
                Add "{searchTerm.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuItemPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id && id !== 'new' && id !== 'create');
  const confirm = useConfirm();

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadCategories() {
      try {
        const list = await getDishList();
        if (!isActive) {
          return;
        }

        const unique = new Set();
        list.forEach((item) => {
          if (item.category) {
            unique.add(item.category);
          }
        });
        setCategories(Array.from(unique).sort((a, b) => a.localeCompare(b)));
      } catch (loadError) {
        console.error('Failed to load categories:', loadError);
        if (isActive) {
          setCategories([]);
        }
      }
    }

    async function loadDish() {
      if (!isEditMode) {
        setForm(emptyForm);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const dish = await getDishById(id);
        if (!isActive) {
          return;
        }

        setForm({
          name: dish.name,
          category: dish.category,
          price: toPriceInput(dish.price),
          isAvailable: dish.isAvailable,
        });
      } catch (loadError) {
        console.error('Failed to load dish:', loadError);
        if (isActive) {
          setError('Could not load this menu item.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadCategories();
    loadDish();

    return () => {
      isActive = false;
    };
  }, [id, isEditMode]);

  useEffect(() => {
    if (form.category && !categories.includes(form.category)) {
      setCategories((prev) => [...prev, form.category].sort((a, b) => a.localeCompare(b)));
    }
  }, [form.category, categories]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value) => {
    setForm((prev) => ({ ...prev, category: value }));
  };

  const handleAddCategory = (value) => {
    if (!categories.includes(value)) {
      setCategories((prev) => [...prev, value].sort((a, b) => a.localeCompare(b)));
    }
    setForm((prev) => ({ ...prev, category: value }));
  };

  const handleAvailabilityToggle = (nextValue) => {
    setForm((prev) => ({ ...prev, isAvailable: nextValue }));
  };

  const handleSave = async () => {
    setError('');
    setNotice(null);

    const name = form.name.trim();
    const category = form.category.trim();
    const priceCheck = normalizePriceInput(form.price);

    if (!name || !category || priceCheck.value === null) {
      setError('Name, category, and a valid price are required.');
      return;
    }

    if (priceCheck.value < 0) {
      setError('Price must be a positive number.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        category,
        price: Math.round(priceCheck.value * 100),
        isAvailable: form.isAvailable,
      };

      if (isEditMode) {
        await updateDish(id, payload);
      } else {
        await createDish(payload);
      }

      setNotice({ type: 'success', message: 'Menu item saved.' });
      setTimeout(() => navigate('/menu'), 350);
    } catch (saveError) {
      console.error('Failed to save dish:', saveError);
      setError(saveError?.message || 'Failed to save menu item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || deleting) {
      return;
    }

    const confirmed = await confirm({
      title: 'Delete menu item',
      message: 'Delete this menu item? This action cannot be undone.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteDish(id);
      navigate('/menu');
    } catch (deleteError) {
      console.error('Failed to delete dish:', deleteError);
      setError(deleteError?.message || 'Failed to delete menu item.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8 sm:py-10">
          <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-7 sm:p-8 text-center">
            <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-800">Loading Menu Item</h2>
            <p className="text-sm text-slate-500 mt-1">Fetching details from your menu catalog.</p>
            <button
              type="button"
              onClick={() => navigate('/menu')}
              className="mt-5 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-8 sm:pb-10 font-sans text-slate-900 relative z-10">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Menu Items</p>
            <h1 className="text-2xl font-bold text-slate-800 font-display">
              {isEditMode ? 'Edit Menu Item' : 'Add Menu Item'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Keep your menu up to date with the latest dishes.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Menu
          </button>
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

        {error && (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <ChefHat size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Dish details</h2>
              <p className="text-sm text-slate-500 mt-1">Name, category, and price are required.</p>
            </div>
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dish name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Paneer Tikka"
                className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Category</span>
              <SearchableDropdown
                options={categories}
                value={form.category}
                onChange={handleCategoryChange}
                allowAdd
                onAddNew={handleAddCategory}
                placeholder="Choose or add a category"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Price (INR)</span>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="h-11 w-full pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </label>

            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Availability</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAvailabilityToggle(true)}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold border transition-colors ${
                    form.isAvailable
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => handleAvailabilityToggle(false)}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold border transition-colors ${
                    !form.isAvailable
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Unavailable
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-900 text-white font-semibold shadow-[0_12px_24px_-18px_rgba(15,23,42,0.8)] hover:bg-slate-800 transition-colors disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Item'}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
