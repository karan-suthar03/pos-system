import { X, Plus, Minus } from 'lucide-react';

function OrderItemPopup({ item, onRemove, onUpdateQuantity }) {
  const handleIncrement = () => onUpdateQuantity(item.id, item.quantity + 1);
  const handleDecrement = () => {
    if (item.quantity > 1) onUpdateQuantity(item.id, item.quantity - 1);
  };

  return (
    <div className="flex items-center gap-3 p-3 mb-2 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-all">
      {/* Item Name & Price - Standard Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 line-clamp-2">
          {item.name}
        </p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">
          ₹{(item.price / 100).toFixed(2)}
        </p>
      </div>
      
      {/* Standard Controls */}
      <div className="flex items-center gap-2 shrink-0">
        
        <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm h-8">
          <button
            onClick={handleDecrement}
            disabled={item.quantity === 1}
            className="w-8 h-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 transition-colors border-r border-gray-100 rounded-l-lg cursor-pointer"
          >
            <Minus size={14} className="text-gray-600" />
          </button>
          
          <span className="w-8 text-center font-bold text-sm text-gray-900">
            {item.quantity}
          </span>
          
          <button
            onClick={handleIncrement}
            className="w-8 h-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors border-l border-gray-100 rounded-r-lg cursor-pointer"
          >
            <Plus size={14} className="text-blue-600" />
          </button>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default OrderItemPopup;