import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChefHat,
  IndianRupee,
  Layers,
  Package,
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
import { getCategories, setCategoryImage, upsertCategory } from '../API/categories.js';
import { listInventoryItems, listRecipe, setRecipe } from '../API/inventory.js';
import { deleteFile, saveFile } from '../API/storage.js';
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

function normalizeRecipeQuantity(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }

  return String(parsed);
}

function buildRecipeFingerprint(rows) {
  const normalized = (rows || []).map((row) => ({
    inventoryItemId: Number(row?.inventoryItemId) || 0,
    quantity: normalizeRecipeQuantity(row?.quantity),
  }));

  return JSON.stringify(normalized);
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

async function resizeImageFile(file, maxSize = 512, quality = 0.82) {
  if (!file?.type?.startsWith('image/')) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const largestSide = Math.max(image.width, image.height);
  if (largestSide <= maxSize) {
    return file;
  }

  const scale = maxSize / largestSide;
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName || 'category'}.jpg`, { type: 'image/jpeg' });
}

const imageObjectUrlCache = new Map();
const imageFetchPromises = new Map();

async function getCachedImageUrl(sourceUrl) {
  if (!sourceUrl) {
    return null;
  }

  if (sourceUrl.startsWith('data:') || sourceUrl.startsWith('blob:')) {
    return sourceUrl;
  }

  if (imageObjectUrlCache.has(sourceUrl)) {
    return imageObjectUrlCache.get(sourceUrl);
  }

  if (imageFetchPromises.has(sourceUrl)) {
    return imageFetchPromises.get(sourceUrl);
  }

  const fetchPromise = (async () => {
    try {
      let response = null;
      const cacheStorage = typeof globalThis !== 'undefined' ? globalThis.caches : undefined;

      if (cacheStorage && typeof cacheStorage.open === 'function') {
        const cache = await cacheStorage.open('pos-category-images-v1');
        response = await cache.match(sourceUrl);
        if (!response) {
          response = await fetch(sourceUrl, { cache: 'force-cache' });
          if (response?.ok) {
            cache.put(sourceUrl, response.clone()).catch(() => {});
          }
        }
      } else {
        response = await fetch(sourceUrl, { cache: 'force-cache' });
      }

      if (!response?.ok) {
        return null;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      imageObjectUrlCache.set(sourceUrl, objectUrl);
      return objectUrl;
    } catch (_error) {
      return null;
    } finally {
      imageFetchPromises.delete(sourceUrl);
    }
  })();

  imageFetchPromises.set(sourceUrl, fetchPromise);
  return fetchPromise;
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
  const [categoryMap, setCategoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [recipeNotice, setRecipeNotice] = useState(null);
  const [recipeError, setRecipeError] = useState('');
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [recipeRows, setRecipeRows] = useState([]);
  const [recipeSnapshot, setRecipeSnapshot] = useState(buildRecipeFingerprint([]));
  const [cachedCategoryImageUrl, setCachedCategoryImageUrl] = useState(null);
  const [pendingCategoryImage, setPendingCategoryImage] = useState({
    file: null,
    previewUrl: null,
    clear: false,
  });
  const [categoryImageState, setCategoryImageState] = useState({
    isUploading: false,
    error: '',
  });

  useEffect(() => {
    let isActive = true;

    async function loadCategories() {
      try {
        const [categoryList, dishList] = await Promise.all([
          getCategories().catch(() => null),
          getDishList().catch(() => []),
        ]);
        if (!isActive) {
          return;
        }

        const unique = new Set();
        const nextCategoryMap = {};

        (categoryList || []).forEach((category) => {
          if (!category?.name) {
            return;
          }
          unique.add(category.name);
          nextCategoryMap[category.name] = category;
        });

        (dishList || []).forEach((item) => {
          if (item?.category) {
            unique.add(item.category);
          }
        });

        setCategories(Array.from(unique).sort((a, b) => a.localeCompare(b)));
        setCategoryMap(nextCategoryMap);
      } catch (loadError) {
        console.error('Failed to load categories:', loadError);
        if (isActive) {
          setCategories([]);
          setCategoryMap({});
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
    let isActive = true;

    const loadInventoryItems = async () => {
      try {
        const items = await listInventoryItems();
        if (isActive) {
          setInventoryItems(items || []);
        }
      } catch (loadError) {
        console.error('Failed to load inventory items:', loadError);
        if (isActive) {
          setRecipeError('Failed to load inventory items.');
        }
      }
    };

    loadInventoryItems();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setRecipeRows([]);
      setRecipeSnapshot(buildRecipeFingerprint([]));
      return;
    }

    let isActive = true;
    setRecipeLoading(true);
    setRecipeError('');
    setRecipeNotice(null);

    (async () => {
      try {
        const recipe = await listRecipe(id);
        if (!isActive) {
          return;
        }
        const rows = (recipe || []).map((entry, index) => ({
          key: entry.id ? `recipe-${entry.id}` : `recipe-${index}`,
          inventoryItemId: entry.inventoryItemId,
          quantity: entry.quantity ? String(entry.quantity) : '',
        }));
        setRecipeRows(rows);
        setRecipeSnapshot(buildRecipeFingerprint(rows));
      } catch (loadError) {
        console.error('Failed to load recipe:', loadError);
        if (isActive) {
          setRecipeError('Failed to load recipe.');
        }
      } finally {
        if (isActive) {
          setRecipeLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [id, isEditMode]);

  useEffect(() => {
    if (form.category && !categories.includes(form.category)) {
      setCategories((prev) => [...prev, form.category].sort((a, b) => a.localeCompare(b)));
    }
  }, [form.category, categories]);

  const selectedCategoryName = form.category.trim();
  const selectedCategory = selectedCategoryName || null;
  const selectedCategoryInfo = selectedCategory ? categoryMap[selectedCategory] : null;
  const isCategoryImageDisabled = !selectedCategory || categoryImageState.isUploading;
  const hasPendingCategoryImageChange = Boolean(
    pendingCategoryImage.file || pendingCategoryImage.clear,
  );
  const stagedCategoryImageUrl = pendingCategoryImage.clear
    ? null
    : (pendingCategoryImage.previewUrl
      || cachedCategoryImageUrl
      || selectedCategoryInfo?.imageUrl
      || null);

  const inventoryOptions = useMemo(() => (
    [...inventoryItems].sort((a, b) => a.name.localeCompare(b.name))
  ), [inventoryItems]);

  const inventoryById = useMemo(() => {
    const map = {};
    inventoryOptions.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [inventoryOptions]);

  const recipeFingerprint = useMemo(() => (
    buildRecipeFingerprint(recipeRows)
  ), [recipeRows]);

  const isRecipeDirty = useMemo(() => (
    isEditMode && recipeFingerprint !== recipeSnapshot
  ), [isEditMode, recipeFingerprint, recipeSnapshot]);

  const recipeStatus = useMemo(() => {
    if (!isEditMode) {
      return null;
    }
    if (recipeLoading) {
      return {
        label: 'Loading...',
        className: 'border-slate-200 bg-slate-50 text-slate-600',
      };
    }
    if (recipeSaving) {
      return {
        label: 'Saving...',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    if (isRecipeDirty) {
      return {
        label: 'Unsaved changes',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    return {
      label: 'Saved',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }, [isEditMode, isRecipeDirty, recipeLoading, recipeSaving]);

  useEffect(() => {
    setCategoryImageState((prev) => ({ ...prev, error: '' }));
  }, [selectedCategory]);

  useEffect(() => {
    if (recipeNotice?.type === 'success' && isRecipeDirty) {
      setRecipeNotice(null);
    }
  }, [recipeNotice, isRecipeDirty]);

  useEffect(() => {
    setPendingCategoryImage({
      file: null,
      previewUrl: null,
      clear: false,
    });
  }, [selectedCategory]);

  useEffect(() => () => {
    if (pendingCategoryImage.previewUrl) {
      URL.revokeObjectURL(pendingCategoryImage.previewUrl);
    }
  }, [pendingCategoryImage.previewUrl]);

  useEffect(() => {
    let isActive = true;
    const imageUrl = selectedCategoryInfo?.imageUrl || null;

    setCachedCategoryImageUrl(null);

    if (!imageUrl) {
      return () => {
        isActive = false;
      };
    }

    (async () => {
      const cachedUrl = await getCachedImageUrl(imageUrl);
      if (isActive) {
        setCachedCategoryImageUrl(cachedUrl);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selectedCategoryInfo?.imageUrl]);

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

  const handleCategoryImageUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!selectedCategory) {
      setCategoryImageState({ isUploading: false, error: 'Select a category first.' });
      return;
    }

    setCategoryImageState((prev) => ({ ...prev, error: '' }));
    setNotice(null);

    setPendingCategoryImage({
      file,
      previewUrl: URL.createObjectURL(file),
      clear: false,
    });
  };

  const handleRemoveCategoryImage = () => {
    if (!selectedCategory) {
      return;
    }

    setCategoryImageState((prev) => ({ ...prev, error: '' }));
    setNotice(null);

    setPendingCategoryImage({
      file: null,
      previewUrl: null,
      clear: true,
    });
  };

  const handleSaveCategoryImage = async () => {
    if (!selectedCategory || !hasPendingCategoryImageChange || categoryImageState.isUploading) {
      return;
    }

    setCategoryImageState({ isUploading: true, error: '' });
    setNotice(null);

    let storedPath = null;

    try {
      const previousPath = selectedCategoryInfo?.imagePath;
      let updated = null;

      if (pendingCategoryImage.clear) {
        updated = await setCategoryImage({
          name: selectedCategory,
          clearImage: true,
        });

        if (previousPath) {
          deleteFile(previousPath).catch(() => {});
        }
      } else if (pendingCategoryImage.file) {
        const preparedFile = await resizeImageFile(pendingCategoryImage.file);
        const dataUrl = await readFileAsDataUrl(preparedFile);
        const stored = await saveFile({
          dataUrl,
          fileName: preparedFile.name,
          mimeType: preparedFile.type,
          folder: 'categories',
        });
        storedPath = stored.path;

        updated = await upsertCategory({
          name: selectedCategory,
          imagePath: stored.path,
        });

        if (previousPath && previousPath !== stored.path) {
          deleteFile(previousPath).catch(() => {});
        }
      }

      if (updated) {
        setCategoryMap((prev) => ({
          ...prev,
          [updated.name]: updated,
        }));
      }

      setPendingCategoryImage({
        file: null,
        previewUrl: null,
        clear: false,
      });

      setNotice({
        type: 'success',
        message: pendingCategoryImage.clear ? 'Category image removed.' : 'Category image updated.',
      });
      setCategoryImageState({ isUploading: false, error: '' });
    } catch (uploadError) {
      console.error('Failed to update category image:', uploadError);
      if (storedPath) {
        deleteFile(storedPath).catch(() => {});
      }
      setCategoryImageState({
        isUploading: false,
        error: uploadError?.message || 'Failed to update category image.',
      });
    }
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

  const handleAddRecipeRow = () => {
    if (inventoryOptions.length === 0) {
      return;
    }

    const nextItemId = inventoryOptions[0]?.id ?? 0;
    setRecipeRows((prev) => ([
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        inventoryItemId: nextItemId,
        quantity: '',
      },
    ]));
  };

  const handleRecipeRowChange = (key, field, value) => {
    setRecipeRows((prev) => prev.map((row) => (
      row.key === key ? { ...row, [field]: value } : row
    )));
  };

  const handleRemoveRecipeRow = (key) => {
    setRecipeRows((prev) => prev.filter((row) => row.key !== key));
  };

  const handleSaveRecipe = async () => {
    if (!isEditMode || recipeSaving) {
      return;
    }

    setRecipeSaving(true);
    setRecipeError('');
    setRecipeNotice(null);

    try {
      const payload = recipeRows
        .map((row) => ({
          inventoryItemId: row.inventoryItemId,
          quantity: Number.parseFloat(row.quantity),
        }))
        .filter((row) => row.inventoryItemId > 0 && Number.isFinite(row.quantity) && row.quantity > 0);

      const saved = await setRecipe(id, payload);
      const rows = (saved || []).map((entry, index) => ({
        key: entry.id ? `recipe-${entry.id}` : `recipe-${index}`,
        inventoryItemId: entry.inventoryItemId,
        quantity: entry.quantity ? String(entry.quantity) : '',
      }));
      setRecipeRows(rows);
      setRecipeSnapshot(buildRecipeFingerprint(rows));
      setRecipeNotice({ type: 'success', message: 'Recipe saved.' });
    } catch (saveError) {
      console.error('Failed to save recipe:', saveError);
      setRecipeError(saveError?.message || 'Failed to save recipe.');
    } finally {
      setRecipeSaving(false);
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

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Category image</span>
                {categoryImageState.isUploading && (
                  <span className="text-xs font-semibold text-amber-600">Uploading...</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {stagedCategoryImageUrl ? (
                    <img
                      src={stagedCategoryImageUrl}
                      alt={selectedCategory}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">No image</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    className={`inline-flex items-center justify-center h-9 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                      isCategoryImageDisabled
                        ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                    }`}
                  >
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isCategoryImageDisabled}
                      onChange={handleCategoryImageUpload}
                      className="hidden"
                    />
                  </label>
                  {(selectedCategoryInfo?.imagePath || pendingCategoryImage.file || pendingCategoryImage.clear) && (
                    <button
                      type="button"
                      onClick={handleRemoveCategoryImage}
                      disabled={categoryImageState.isUploading}
                      className="h-9 px-4 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-semibold hover:bg-rose-100 disabled:opacity-60"
                    >
                      Clear image
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCategoryImage}
                    disabled={isCategoryImageDisabled || !hasPendingCategoryImageChange}
                    className={`h-9 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                      isCategoryImageDisabled || !hasPendingCategoryImageChange
                        ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Save image
                  </button>
                  {pendingCategoryImage.clear && (
                    <span className="text-xs text-slate-500 font-semibold">
                      Image will be removed after save.
                    </span>
                  )}
                  {categoryImageState.error && (
                    <span className="text-xs text-rose-600 font-semibold">{categoryImageState.error}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-400">Recommended: square image up to 512px.</span>
            </div>

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

        <div className="rounded-2xl border border-slate-200/70 bg-white/78 backdrop-blur-xl shadow-[0_18px_35px_-30px_rgba(15,23,42,0.75)] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Recipe ingredients</h2>
                <p className="text-sm text-slate-500 mt-1">Stock is deducted when an item is served.</p>
              </div>
            </div>
            {recipeStatus && (
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${recipeStatus.className}`}
              >
                {recipeStatus.label}
              </span>
            )}
          </div>

          {recipeNotice && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                recipeNotice.type === 'error'
                  ? 'border-rose-200 bg-rose-50/80 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
              }`}
            >
              {recipeNotice.message}
            </div>
          )}

          {recipeError && (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-4 text-sm font-semibold text-rose-700">
              {recipeError}
            </div>
          )}

          {!isEditMode ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              Save this menu item to configure its recipe.
            </div>
          ) : recipeLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              Loading recipe...
            </div>
          ) : inventoryOptions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>No inventory items yet. Add ingredients to build recipes.</span>
              <button
                type="button"
                onClick={() => navigate('/inventory/add')}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
              >
                <Package size={14} />
                Add inventory item
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recipeRows.length === 0 && (
                <div className="text-sm text-slate-500">No ingredients added yet.</div>
              )}

              <div className="grid gap-4">
                {recipeRows.map((row) => {
                  const selectedItem = inventoryById[row.inventoryItemId];
                  return (
                    <div key={row.key} className="grid gap-2">
                      <div className="grid gap-3 sm:grid-cols-[1fr_160px_44px] sm:items-end">
                        <label className="grid gap-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                            Ingredient
                          </span>
                          <select
                            value={row.inventoryItemId || ''}
                            onChange={(event) => handleRecipeRowChange(
                              row.key,
                              'inventoryItemId',
                              Number.parseInt(event.target.value, 10) || 0,
                            )}
                            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-100"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryOptions.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                            Qty / item
                          </span>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.quantity}
                              onChange={(event) => handleRecipeRowChange(row.key, 'quantity', event.target.value)}
                              className="h-11 w-full px-3 pr-12 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-100"
                              placeholder="0.00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                              {selectedItem?.unit || '--'}
                            </span>
                          </div>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeRow(row.key)}
                          className="h-11 w-11 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center"
                          aria-label="Remove ingredient"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="text-xs text-slate-400 min-h-[16px]">
                        {selectedItem ? `On hand: ${selectedItem.onHand.toFixed(2)} ${selectedItem.unit}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddRecipeRow}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add ingredient
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  disabled={recipeSaving || !isRecipeDirty}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white font-semibold shadow-[0_12px_24px_-18px_rgba(15,23,42,0.8)] hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  <Save size={14} />
                  {recipeSaving ? 'Saving...' : 'Save recipe'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
