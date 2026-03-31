import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

const defaultOptions = {
  title: 'Confirm action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  tone: 'default',
};

const toneStyles = {
  default: {
    icon: 'bg-slate-100 text-slate-600',
    button: 'bg-slate-900 hover:bg-slate-800 text-white',
  },
  warning: {
    icon: 'bg-amber-100 text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  danger: {
    icon: 'bg-rose-100 text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    ...defaultOptions,
  });
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        ...defaultOptions,
        ...options,
      });
    });
  }, []);

  const handleClose = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!state.open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose(false);
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.open, handleClose]);

  const contextValue = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        tone={state.tone}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  tone,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  const styles = toneStyles[tone] || toneStyles.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-slate-200/70 bg-white/90 shadow-[0_24px_50px_-25px_rgba(15,23,42,0.6)] p-6 animate-fade-in"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${styles.icon}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            {message && <p className="text-sm text-slate-500 mt-1">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 px-4 rounded-xl text-sm font-semibold shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)] transition-colors ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
