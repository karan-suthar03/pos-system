import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Search,
  ShoppingBag,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getDishes } from '../API/dishes';
import { createOrder } from '../API/orders';
import { getCategories } from '../API/categories';

import hotBeverage from '../assets/hotBeverage.png';
import coldCoffee from '../assets/coldCoffee.png';
import refresher from '../assets/refresher.png';
import smoothie from '../assets/smoothie.png';
import shake from '../assets/shake.png';
import sandwich from '../assets/sandwich.png';
import maggie from '../assets/maggie.png';
import pasta from '../assets/pasta.png';
import fries from '../assets/fries.png';
import pizza from '../assets/pizza.png';
import burger from '../assets/burger.png';
import momo from '../assets/momo.png';
import extra from '../assets/extra.png';
import misc from '../assets/misc.png';

const DEFAULT_CATEGORY_IMAGES = {
  'Hot Beverage': hotBeverage,
  'Cold Coffee': coldCoffee,
  Refresher: refresher,
  Smoothie: smoothie,
  Shake: shake,
  Sandwich: sandwich,
  Maggi: maggie,
  Pasta: pasta,
  Fries: fries,
  Pizza: pizza,
  Burger: burger,
  Momo: momo,
  Extra: extra,
  Misc: misc,
};

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

function getTotal(items) {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function CreateOrderPopup({
  isOpen,
  onClose,
  onConfirm,
  initialOrder = null,
  onSaveDraft = null,
  editingDraftId = null,
}) {
  const [allDishes, setAllDishes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [order, setOrder] = useState(initialOrder || { items: [], tag: '' });
  const [categoryImages, setCategoryImages] = useState({});
  const [cachedCategoryImages, setCachedCategoryImages] = useState({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        const [dishes, categories] = await Promise.all([
          getDishes(),
          getCategories(),
        ]);

        setAllDishes(dishes);

        const nextImages = {};
        (categories || []).forEach((category) => {
          if (category?.name && category?.imageUrl) {
            nextImages[category.name] = category.imageUrl;
          }
        });
        setCategoryImages(nextImages);
      } catch (_error) {
        console.error('Failed to fetch dishes:', _error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setActiveCategory(null);
      setOrder({ items: [], tag: '' });
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setOrder(initialOrder || { items: [], tag: '' });
  }, [isOpen, initialOrder]);

  useEffect(() => {
    let isActive = true;
    const entries = Object.entries(categoryImages || {});

    if (entries.length === 0) {
      setCachedCategoryImages({});
      return () => {
        isActive = false;
      };
    }

    (async () => {
      const nextImages = {};
      await Promise.all(entries.map(async ([name, url]) => {
        const cachedUrl = await getCachedImageUrl(url);
        if (cachedUrl) {
          nextImages[name] = cachedUrl;
        }
      }));

      if (isActive) {
        setCachedCategoryImages(nextImages);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [categoryImages]);

  const categories = allDishes ? Object.keys(allDishes) : [];
  const resolvedCategoryImages = useMemo(() => ({
    ...DEFAULT_CATEGORY_IMAGES,
    ...categoryImages,
    ...cachedCategoryImages,
  }), [categoryImages, cachedCategoryImages]);
  const isGridView = !activeCategory && !searchQuery.trim();

  const displayedItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      const matched = [];
      Object.values(allDishes || {}).forEach((group) => {
        if (!Array.isArray(group)) {
          return;
        }

        const results = group.filter((dish) => {
          const name = String(dish?.name || '').toLowerCase();
          return name.includes(normalizedQuery);
        });
        matched.push(...results);
      });
      return matched;
    }

    if (activeCategory) {
      return Array.isArray(allDishes?.[activeCategory]) ? allDishes[activeCategory] : [];
    }

    return [];
  }, [allDishes, activeCategory, searchQuery]);

  function onCategorySelect(category) {
    setActiveCategory(category);
  }

  function onBackToCategories() {
    setActiveCategory(null);
    setSearchQuery('');
  }

  function onSelectMenuItem(item) {
    setOrder((current) => {
      const existing = current.items.find((entry) => entry.id === item.id);
      if (!existing) {
        return {
          ...current,
          items: [...current.items, { ...item, quantity: 1 }],
        };
      }

      return {
        ...current,
        items: current.items.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        ),
      };
    });
  }

  function updateQuantity(itemId, nextQuantity) {
    if (nextQuantity <= 0) {
      setOrder((current) => ({
        ...current,
        items: current.items.filter((entry) => entry.id !== itemId),
      }));
      return;
    }

    setOrder((current) => ({
      ...current,
      items: current.items.map((entry) =>
        entry.id === itemId ? { ...entry, quantity: nextQuantity } : entry,
      ),
    }));
  }

  async function handlePlaceOrder() {
    if (order.items.length === 0 || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createOrder(order);
      onConfirm?.();
    } catch (_error) {
      setIsSubmitting(false);
    }
  }

  function handleSaveDraft() {
    if (order.items.length === 0 || isSavingDraft || !onSaveDraft) {
      return;
    }

    setIsSavingDraft(true);
    onSaveDraft(order, editingDraftId);

    setIsSavingDraft(false);
    onClose?.();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-md">
      <div className="relative bg-white/85 backdrop-blur-xl w-full max-w-7xl h-[92vh] rounded-[28px] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)] flex flex-col xl:flex-row overflow-hidden ring-1 ring-slate-200/70">
        <div className="flex-1 flex flex-col bg-slate-50/50 min-h-0">
          <div className="px-6 py-4 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shrink-0 shadow-[0_6px_20px_-16px_rgba(15,23,42,0.28)] z-10">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
                <UtensilsCrossed size={20} className="text-slate-700" strokeWidth={2.5} />
                Menu Categories
              </h2>
              <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 mt-1">
                Build order with live pricing
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10 rounded-xl transition-all outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden min-h-0">
            {activeCategory ? (
              <div className="w-56 bg-white/70 border-r border-slate-200/60 overflow-y-auto shrink-0 flex flex-col backdrop-blur-xl">
                <div className="p-3 space-y-1.5">
                  <button
                    onClick={onBackToCategories}
                    className="w-full text-left px-3 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-700 transition-all flex items-center gap-2 mb-2 border border-dashed border-slate-300 hover:border-amber-300 cursor-pointer"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                    All Categories
                  </button>
                  <div className="h-px bg-slate-200/80 my-2 mx-2" />
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => onCategorySelect(category)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between border-l-4 cursor-pointer ${
                        activeCategory === category
                          ? 'text-slate-800 bg-amber-50/80 border-amber-500 shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900 border-transparent'
                      }`}
                    >
                      <span className="truncate">{category}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={30} className="animate-spin text-slate-600" />
                  <p className="text-sm font-medium">Loading menu...</p>
                </div>
              ) : (
                isGridView ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => onCategorySelect(category)}
                        className="group relative h-44 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200/70 hover:border-amber-300 text-left cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-slate-200">
                          {resolvedCategoryImages[category] ? (
                            <img
                              src={resolvedCategoryImages[category]}
                              alt={category}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-slate-300 to-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-900/20 to-transparent" />
                        </div>

                        <div className="absolute bottom-0 left-0 p-4 w-full">
                          <h3 className="text-lg font-bold text-white leading-tight drop-shadow-sm tracking-tight">
                            {category}
                          </h3>
                          <div className="flex items-center text-slate-100 text-xs mt-1 font-semibold tracking-wide uppercase">
                            <span>{Array.isArray(allDishes[category]) ? allDishes[category].length : 0} items</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayedItems.length === 0 ? (
                      <div className="col-span-2 text-center py-14 text-slate-400">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 mx-auto mb-3 flex items-center justify-center">
                          <UtensilsCrossed size={28} className="opacity-70" />
                        </div>
                        <p className="text-sm font-medium">No items found</p>
                      </div>
                    ) : (
                      displayedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col text-left p-4 rounded-2xl bg-white/80 border border-slate-200/70 hover:border-amber-300 hover:shadow-md transition-all h-full"
                        >
                          <div className="flex justify-between items-start w-full mb-2 gap-2">
                            <span className="font-semibold text-slate-800 line-clamp-2 leading-snug">
                              {item.name}
                            </span>
                          </div>
                          <div className="mt-auto pt-3 flex justify-between items-center w-full border-t border-slate-100">
                            <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              ₹{(Number(item.price || 0) / 100).toFixed(2)}
                            </span>
                            <button
                              onClick={() => onSelectMenuItem(item)}
                              className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              <Plus size={16} strokeWidth={2.8} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="w-full xl:w-96 shrink-0 bg-white/85 backdrop-blur-xl border-t xl:border-t-0 xl:border-l border-slate-200/60 flex flex-col shadow-[0_10px_30px_-25px_rgba(15,23,42,0.65)] z-20 min-h-[40vh]">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200/60 bg-white/70">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.16em] flex items-center gap-2">
              <ShoppingBag size={16} strokeWidth={2.5} />
              Current Order
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-6 py-4">
            <input
              type="text"
              value={order.tag}
              onChange={(event) => setOrder((current) => ({ ...current, tag: event.target.value }))}
              placeholder="Table / Customer Name (optional)"
              className="w-full px-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-base font-semibold text-slate-800 outline-none focus:bg-white focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10 transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
            {order.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-80">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center">
                  <Calculator size={28} />
                </div>
                <p className="text-sm font-medium">No items selected</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-white/90 px-3.5 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400">₹{(item.price / 100).toFixed(2)} / unit</p>
                      </div>
                      <button
                        onClick={() => updateQuantity(item.id, 0)}
                        className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X size={14} strokeWidth={2.8} />
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 text-sm text-slate-600 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 text-sm text-slate-600 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-bold text-slate-800 tracking-tight">
                        ₹{((item.quantity * item.price) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-white/80 border-t border-slate-200/60">
            <div className="flex justify-between items-end mb-4">
              <span className="text-slate-900 font-bold text-lg tracking-tight">Total</span>
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                ₹{(getTotal(order.items) / 100).toFixed(2)}
              </span>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleSaveDraft}
                disabled={order.items.length === 0 || isSavingDraft || !onSaveDraft}
                className="w-full py-3 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all border border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 hover:border-slate-400 cursor-pointer"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} strokeWidth={2.5} />
                    <span>{editingDraftId ? 'Update Draft' : 'Save as Draft'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePlaceOrder}
                disabled={order.items.length === 0 || isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl flex items-center justify-between group font-bold text-sm shadow-[0_12px_24px_-12px_rgba(15,23,42,0.7)] bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <div className="w-full flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Placing...</span>
                  </div>
                ) : (
                  <>
                    <span className="tracking-wide">Place Order</span>
                    <ChevronRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateOrderPopup;