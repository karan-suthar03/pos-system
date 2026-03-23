import { X, Search, ShoppingBag, UtensilsCrossed, ChevronRight, Calculator, Loader2, LayoutGrid, ArrowLeftIcon, Save } from 'lucide-react';
import OrderItemsListPopup from './OrderItemsListPopup'; 
import { useEffect, useState } from 'react';
import { getDishes } from '../API/dishes.js';
import { createOrder } from '../API/orders.js';

// Images
import hotBeverage from "../assets/hotBeverage.png"
import coldCoffee from "../assets/coldCoffee.png"
import refresher from "../assets/refresher.png"
import smoothie from "../assets/smoothie.png"
import shake from "../assets/shake.png"
import sandwich from "../assets/sandwich.png"
import maggie from "../assets/maggie.png"
import pasta from "../assets/pasta.png"
import fries from "../assets/fries.png"
import pizza from "../assets/pizza.png"
import burger from "../assets/burger.png"
import momo from "../assets/momo.png"
import extra from "../assets/extra.png"
import misc from "../assets/misc.png"

const getCategoryImage = (category) => {
  const keywords = {
    'Hot Beverage': hotBeverage,
    'Cold Coffee' : coldCoffee,
    'Refresher' : refresher,
    'Smoothie': smoothie,
    'Shake' : shake,
    'Sandwich':sandwich, 
    'Maggi':maggie, 
    'Pasta':pasta, 
    'Fries':fries, 
    'Pizza':pizza, 
    'Burger':burger, 
    'Momo':momo, 
    'Extra':extra, 
    'Misc':misc
  };
  return keywords[category];
};

function OrderPopup({ searchQuery, onSearchChange, onConfirm, onCancel, activeCategory, onCategoryChange, initialOrder = null, onSaveDraft = null, editingDraftId = null }) {

  const getOrderTotal = (order) => {
    return order.items.reduce((sum, item) => sum + item.price * item.quantity / 100, 0);
  }

  const [allDishes, setAllDishes] = useState({});
  // Use prop if provided, otherwise default to null
  const actualActiveCategory = activeCategory !== undefined ? activeCategory : null;
  const [order, setOrder] = useState(initialOrder || {items: [], tag: ''});
  const [tagError, setTagError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const dishes = await getDishes();
        setAllDishes(dishes);
      } catch (error) {
        console.error("Error fetching dishes:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // If search is active, ensure we show the split view so users can see results
  useEffect(() => {
    if (searchQuery && !actualActiveCategory) {
      // Optional: You can set a default category or just leave it null to show "All Results"
      // But we need to ensure the view switches from Grid to List
    }
  }, [searchQuery, actualActiveCategory]);

  const categories = Object.keys(allDishes);
  
  // Logic: What items to show in the list?
  let displayedItems = [];
  if (searchQuery) {
    Object.values(allDishes).forEach(group => {
      const matches = group.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
      displayedItems.push(...matches);
    });
  } else if (actualActiveCategory) {
    displayedItems = allDishes[actualActiveCategory] || [];
  }

  function onUpdateQuantity(itemId, newQuantity) {
    const updatedItems = order.items.map(i => 
      i.id === itemId ? { ...i, quantity: newQuantity } : i
    );
    setOrder({ ...order, items: updatedItems });
  }

  function onRemoveItem(itemId) {
    const updatedItems = order.items.filter(i => i.id !== itemId);
    setOrder({ ...order, items: updatedItems });
  }

  function onSelectMenuItem(item) {
    const existingItem = order.items.find(i => i.id === item.id);
    let updatedItems;   
    if (existingItem) {
      updatedItems = order.items.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      updatedItems = [...order.items, { ...item, quantity: 1 }];
    }   
    setOrder({ ...order, items: updatedItems });
  }

  function onOrderConfirm(){
    setTagError('');
    setIsSubmitting(true);
    (async ()=>{
      try {
        await createOrder(order);
        onConfirm();
      } catch (error) {
        console.error("Error saving order:", error);
        setIsSubmitting(false);
      }
    })();
  }

  function onSaveDraftClick(){
    if (onSaveDraft && order.items.length > 0) {
      setIsSavingDraft(true);
      onSaveDraft(order, editingDraftId);
      // Brief delay for visual feedback
      setTimeout(() => {
        setIsSavingDraft(false);
        onCancel(); // Close the popup after saving
      }, 300);
    }
  }

  // Determine if we are in "Grid View" (Categories) or "List View" (Items)
  const isGridView = !actualActiveCategory && !searchQuery;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-black/5 relative">
        
        {/* ================= LEFT SIDE: MAIN CONTENT ================= */}
        <div className="flex-1 flex flex-col bg-gray-50/50">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4 shrink-0 shadow-sm z-10">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-blue-600"/>
                {isGridView ? 'Menu Categories' : (actualActiveCategory || 'Search Results')}
              </h2>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={onSearchChange}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-lg transition-all outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {isLoading ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white z-20">
                 <Loader2 size={32} className="animate-spin text-blue-600" />
                 <p className="text-sm text-gray-500 font-medium">Loading Menu...</p>
               </div>
            ) : (
              <>
                {/* === VIEW 1: CATEGORY IMAGE GRID (Show only when home) === */}
                {isGridView ? (
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => onCategoryChange(category)}
                          className="group relative h-40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-blue-400 text-left"
                        >
                          <div className="absolute inset-0 bg-gray-200">
                             <img 
                              src={getCategoryImage(category)} 
                              alt={category}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          </div>
                          
                          <div className="absolute bottom-0 left-0 p-4 w-full">
                             <h3 className="text-lg font-bold text-white leading-tight shadow-black drop-shadow-sm">
                               {category}
                             </h3>
                             <div className="flex items-center text-blue-100 text-xs mt-1 font-medium">
                               <span>{allDishes[category]?.length} items</span>
                             </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* === VIEW 2: SPLIT VIEW (Sidebar + Items) === */
                  <div className="flex w-full h-full">
                    
                    {/* Sidebar Tabs */}
                    <div className="w-[200px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col">
                       <div className="p-2 space-y-1">
                          {/* "All Categories" Button to go back to Grid */}
                          <button
                            onClick={() => { onCategoryChange(null); onSearchChange({target:{value:''}}); }}
                            className="w-full text-left px-3 py-3 rounded-lg text-m font-bold text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-all flex items-center gap-2 mb-2 border border-dashed border-gray-300 hover:border-blue-300"
                          >
                            <ArrowLeftIcon size={16} />
                            All Categories
                          </button>

                          <div className="h-px bg-gray-100 my-2 mx-2" />

                          {/* Category List */}
                          {categories.map(category => (
                            <button
                              key={category}
                              onClick={() => onCategoryChange(category)}
                              className={`
                                w-full text-left px-3 py-2.5 rounded-lg text-lg font-medium transition-all flex items-center justify-between
                                ${actualActiveCategory === category 
                                  ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 border-l-4 border-blue-600' 
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'}
                              `}
                            >
                              <span className="truncate">{category}</span>
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* Items Grid */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
                       <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                        {displayedItems.length === 0 ? (
                           <div className="col-span-3 text-center py-12 text-gray-400">
                              <UtensilsCrossed size={40} className="mx-auto mb-2 opacity-30"/>
                              <p className="text-sm">No items found in this category</p>
                           </div>
                        ) : (
                          displayedItems.map(item => (
                            <button
                              key={item.id}
                              onClick={() => onSelectMenuItem(item)}
                              className="flex flex-col text-left p-3 rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group h-full cursor-pointer"
                            >
                               <div className="flex justify-between items-start w-full mb-2">
                                  <span className="font-semibold text-gray-800 line-clamp-2 leading-snug">
                                    {item.name}
                                  </span>
                               </div>
                               <div className="mt-auto pt-2 flex justify-between items-center w-full border-t border-gray-50">
                                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    ₹{(item.price / 100).toFixed(2)}
                                  </span>
                                  <div className="w-7 h-7 rounded-full bg-gray-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <PlusIcon size={16} />
                                  </div>
                               </div>
                            </button>
                          ))
                        )}
                       </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE: ORDER TICKET ================= */}
        {/* (Unchanged from previous standard version) */}
        <div className="w-[400px] shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
          
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} />
              Current Order
            </h3>
            <button
              onClick={onCancel}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
            
          <div className="px-6 py-4">
            <input
              type="text"
              value={order.tag}
              onChange={(e) => setOrder({ ...order, tag: e.target.value })}
              placeholder="Table / Customer Name (Optional)"
              className={`
                w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-base font-semibold text-gray-800 placeholder:font-normal placeholder:text-gray-400
                focus:outline-none focus:bg-white transition-all
                ${tagError ? 'border-red-300 focus:border-red-400 bg-red-50/50' : 'border-gray-200 focus:border-blue-500'}
              `}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
             {order.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-60">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <Calculator size={28} />
                  </div>
                  <p className="text-sm font-medium">No items selected</p>
                </div>
             ) : (
                <OrderItemsListPopup
                  items={order.items}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                />
             )}
          </div>

          <div className="p-6 bg-white border-t border-gray-200">
            <div className="flex justify-between items-end mb-4">
                <span className="text-gray-900 font-bold text-lg">Total</span>
                <span className="text-3xl font-black text-blue-600 tracking-tight">
                  ₹{getOrderTotal(order)}
                </span>
            </div>

            <div className="space-y-2">
              {onSaveDraft && (
                <button
                  onClick={onSaveDraftClick}
                  disabled={order.items.length === 0 || isSavingDraft}
                  className={`
                    w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-base
                    transition-all duration-200
                    ${(order.items.length === 0 || isSavingDraft)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 hover:border-gray-400 cursor-pointer'}
                  `}
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>{editingDraftId ? 'Update Draft' : 'Save as Draft'}</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onOrderConfirm}
                disabled={order.items.length === 0 || isSubmitting}
                className={`
                  w-full py-3.5 px-6 rounded-xl flex items-center justify-between group font-bold text-base shadow-lg
                  transition-all duration-200
                  ${(order.items.length === 0 || isSubmitting)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 hover:-translate-y-0.5 cursor-pointer'}
                `}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center w-full gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>Place Order</span>
                    <ChevronRight className={`transition-transform duration-200 ${order.items.length > 0 ? 'group-hover:translate-x-1' : ''}`} size={20} />
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

const PlusIcon = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default OrderPopup;