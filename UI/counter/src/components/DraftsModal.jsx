import { Edit3, FileText, Trash2, Utensils, X } from 'lucide-react';
import dayjs from 'dayjs';

function DraftsModal({ isOpen, drafts, onClose, onResumeDraft, onDeleteDraft }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_28px_70px_-28px_rgba(15,23,42,0.5)] border border-slate-200/70 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200/60 flex justify-between items-center bg-white/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100/80 text-slate-700 rounded-xl shadow-sm border border-amber-200/70">
              <FileText size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Saved Drafts</h2>
              <p className="text-xs text-slate-500">Resume or delete your incomplete orders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
          {drafts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                <FileText size={30} className="opacity-70" />
              </div>
              <p className="text-sm font-medium">No drafts found</p>
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
                    className="bg-white/90 border border-slate-200/70 rounded-2xl p-4 hover:border-amber-300 hover:shadow-md transition-all group flex flex-col"
                  >
                    <div className="mb-3">
                      <h3 className="font-bold text-slate-900 truncate text-base tracking-tight">{draft.tag || `Draft ${draft.id}`}</h3>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Saved: {dayjs(draft.createdAt).format('DD MMM YYYY, hh:mm A')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-600 bg-slate-50/80 border border-slate-200/60 px-3 py-2 rounded-xl mb-4">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Utensils size={14} className="text-slate-400" strokeWidth={2.5} />
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                      <span className="font-bold text-slate-900 tracking-tight">₹{(total / 100).toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => onResumeDraft(draft.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-slate-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit3 size={16} strokeWidth={2.4} /> Resume
                      </button>
                      <button
                        onClick={() => onDeleteDraft(draft.id)}
                        className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="Delete Draft"
                      >
                        <Trash2 size={16} strokeWidth={2.4} />
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
