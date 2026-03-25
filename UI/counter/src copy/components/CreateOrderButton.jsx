import { Plus } from 'lucide-react';

function CreateOrderButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-3 px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg cursor-pointer"
    >
      <Plus size={24} />
      Create New Order
    </button>
  );
}

export default CreateOrderButton;
