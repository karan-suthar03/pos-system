import { Edit3, FileText, Trash2, Utensils, X } from 'lucide-react';
import dayjs from 'dayjs';

function DraftsModal({ isOpen, drafts, onClose, onResumeDraft, onDeleteDraft }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Saved Drafts</h2>
              <p className="text-xs text-gray-500">Resume or delete your incomplete orders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30">
          {drafts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <FileText size={40} className="mb-2 opacity-30" />
              <p className="text-sm">No drafts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {drafts.map((draft) => {
                const total = (draft.items || []).reduce(
                  (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
                  0,
                );
                const itemCount = (draft.items || []).reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
                );

                return (
                  <div
                    key={draft.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all group flex flex-col"
                  >
                    <div className="mb-3">
                      <h3 className="font-bold text-gray-900 truncate text-base">{draft.tag || `Draft ${draft.id}`}</h3>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Saved: {dayjs(draft.createdAt).format('DD MMM YYYY, hh:mm A')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg mb-4">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Utensils size={14} className="text-gray-400" />
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                      <span className="font-bold text-gray-900">₹{(total / 100).toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => onResumeDraft(draft.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 size={16} /> Resume
                      </button>
                      <button
                        onClick={() => onDeleteDraft(draft.id)}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Draft"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DraftsModal;
