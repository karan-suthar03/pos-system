import { ClipboardList } from 'lucide-react';
import OrderItem from './OrderItem';

function OrderItemsList({ 
  items,  
  onRemove, 
  onToggleServed = null,
  showCheckbox = false,
  readOnly = false
}) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
          <ClipboardList className="text-gray-300" size={32} />
        </div>
        <p className="text-gray-500 font-medium">Order is empty</p>
        <p className="text-xs text-gray-400">Add items to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <OrderItem
          key={item.id}
          item={item}
          onRemove={onRemove}
          onToggleServed={onToggleServed}
          showCheckbox={showCheckbox}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

export default OrderItemsList;