import { ShoppingCart } from 'lucide-react';

function EmptyState() {
  return (
    <div className="text-center py-24 bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200">
      <div className="inline-flex p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
        <ShoppingCart size={64} className="text-blue-400" />
      </div>
      <p className="text-xl font-semibold text-gray-600 mb-2">No orders yet</p>
      <p className="text-gray-400">Create your first order to get started</p>
    </div>
  );
}

export default EmptyState;
