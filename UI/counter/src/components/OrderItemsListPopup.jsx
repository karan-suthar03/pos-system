import { Package } from 'lucide-react';
import OrderItemPopup from './OrderItemPopup';

function OrderItemsListPopup({ 
  items,  
  onRemove, 
  onUpdateQuantity
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
        <Package size={40} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-medium">No items selected yet</p>
        <p className="text-xs text-gray-400 mt-1">Add items from the menu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <OrderItemPopup
          key={item.id}
          item={item}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
        />
      ))}
    </div>
  );
}

export default OrderItemsListPopup;
