import {
  ArrowLeft,
  Calculator,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getDishes } from '../API/dishes';

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

const CATEGORY_IMAGES = {
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

const ORDER_ITEMS = [
  { id: 1, name: 'Classic Cold Coffee', quantity: 2, price: 9000 },
  { id: 2, name: 'Peri Peri Fries', quantity: 1, price: 8000 },
];

function getTotal(items) {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function CreateOrderPopup({ isOpen, onClose }) {
  const [allDishes, setAllDishes] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        const dishes = await getDishes();
        setAllDishes(dishes || {});
      } catch (_error) {
        setAllDishes({});
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen]);

  const categoryCards = useMemo(() => {
    return Object.keys(allDishes).map((name) => ({
      name,
      image: CATEGORY_IMAGES[name],
      count: Array.isArray(allDishes[name]) ? allDishes[name].length : 0,
    }));
  }, [allDishes]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden ring-1 ring-black/5 relative">
        <div className="flex-1 flex flex-col bg-gray-50/60">
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4 shrink-0 shadow-sm z-10">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <UtensilsCrossed size={20} className="text-blue-600" />
                Menu Categories
              </h2>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search items..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-lg transition-all outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-[220px] bg-white border-r border-gray-200 overflow-y-auto shrink-0 flex flex-col">
              <div className="p-2 space-y-1">
                <button className="w-full text-left px-3 py-3 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-all flex items-center gap-2 mb-2 border border-dashed border-gray-300 hover:border-blue-300 cursor-pointer">
                  <ArrowLeft size={16} />
                  All Categories
                </button>
                <div className="h-px bg-gray-100 my-2 mx-2" />
                {categoryCards.slice(0, 8).map((category) => (
                  <button
                    key={category.name}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent cursor-pointer"
                  >
                    <span className="truncate">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-500">
                  <Loader2 size={30} className="animate-spin text-blue-600" />
                  <p className="text-sm font-medium">Loading menu...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryCards.map((category) => (
                    <button
                      key={category.name}
                      className="group relative h-40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-blue-400 text-left cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gray-200">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-gray-300 to-gray-400" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>

                      <div className="absolute bottom-0 left-0 p-4 w-full">
                        <h3 className="text-lg font-bold text-white leading-tight shadow-black drop-shadow-sm">
                          {category.name}
                        </h3>
                        <div className="flex items-center text-blue-100 text-xs mt-1 font-medium">
                          <span>{category.count} items</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-[390px] shrink-0 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} />
              Current Order
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-4">
            <input
              type="text"
              value="Table 7"
              readOnly
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-semibold text-gray-800 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {ORDER_ITEMS.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-60">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                  <Calculator size={28} />
                </div>
                <p className="text-sm font-medium">No items selected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ORDER_ITEMS.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400">₹{(item.price / 100).toFixed(2)} / unit</p>
                      </div>
                      <button className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg bg-gray-100 border border-gray-200">
                        <button className="w-7 h-7 text-sm text-gray-600 cursor-pointer">-</button>
                        <span className="w-7 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                        <button className="w-7 h-7 text-sm text-gray-600 cursor-pointer">+</button>
                      </div>
                      <span className="text-sm font-bold text-gray-800">
                        ₹{((item.quantity * item.price) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-gray-200">
            <div className="flex justify-between items-end mb-4">
              <span className="text-gray-900 font-bold text-lg">Total</span>
              <span className="text-3xl font-black text-blue-600 tracking-tight">
                ₹{(getTotal(ORDER_ITEMS) / 100).toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              <button className="w-full py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-base bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 hover:border-gray-400 transition-all cursor-pointer">
                <Plus size={18} />
                <span>Save as Draft</span>
              </button>

              <button className="w-full py-3.5 px-6 rounded-xl flex items-center justify-between group font-bold text-base shadow-lg bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 hover:-translate-y-0.5 transition-all cursor-pointer">
                <span>Place Order</span>
                <ChevronRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateOrderPopup;