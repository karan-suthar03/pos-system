import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Bell, ChefHat, CheckCircle2, Cloud, CloudOff, Printer, ChevronDown, Settings2, Smartphone, ReceiptText } from 'lucide-react';

function CounterHeader({
  stockWarningsEnabled = true,
  onToggleStockWarnings,
  lowStockCount = 0,
  onOpenAlerts,
  serverOnline = false,
  bluetoothEnabled = false,
  printerConnected = false,
  printerName = 'No printer',
  printers = [],
  kotPrinterAddress = '',
  receiptPrinterAddress = '',
  onKotPrinterChange,
  onReceiptPrinterChange,
  singlePrinterMode = true,
  onSinglePrinterModeChange,
  printNotice = '',
}) {
  const [isPrinterMenuOpen, setIsPrinterMenuOpen] = useState(false);
  const printerMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (printerMenuRef.current && !printerMenuRef.current.contains(event.target)) {
        setIsPrinterMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 transition-all shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-600 rounded-xl shadow-[0_8px_16px_-6px_rgba(217,119,6,0.5)] flex items-center justify-center shrink-0 transition-transform hover:scale-105">
            <ChefHat size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-800 leading-none tracking-tight">Sunset Point</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Point Of Sale</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden sm:block">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                serverOnline
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50/80 border-rose-200 text-rose-700'
              }`}
            >
              {serverOnline ? <Cloud size={12} /> : <CloudOff size={12} />}
              {serverOnline ? 'Server online' : 'Server offline'}
            </div>
          </div>

          {/* Printer UI Redesign */}
          <div className="relative" ref={printerMenuRef}>
            <button 
              onClick={() => setIsPrinterMenuOpen(!isPrinterMenuOpen)}
              className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 hover:scale-[1.02] ${
                printerConnected 
                  ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80' 
                  : 'bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100/80'
              }`}
            >
              <Printer size={14} className="opacity-90" />
              <span className="text-xs font-bold tracking-wide whitespace-nowrap truncate max-w-[150px]">
                {printerConnected ? printerName : 'No Printer'}
              </span>
              {printerConnected ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={14} className="text-rose-500" />
              )}
              <ChevronDown size={14} className={`ml-0.5 opacity-50 transition-transform ${isPrinterMenuOpen ? 'rotate-180' : ''}`} />
              
              {!bluetoothEnabled && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white"></span>
                </span>
              )}
            </button>

            {isPrinterMenuOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4 z-50 origin-top-right animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Settings2 size={16} className="text-slate-400" />
                    Hardware Settings
                  </div>
                </div>
                
                {!bluetoothEnabled && (
                  <div className="mb-4 bg-rose-50 rounded-xl p-3 border border-rose-100 flex gap-2 text-rose-700">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 opacity-80" />
                    <div className="text-xs leading-relaxed font-semibold">
                      Bluetooth is currently disabled. Please enable it in your Android device settings.
                    </div>
                  </div>
                )}

                {printNotice && (
                  <div className="mb-4 bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex gap-2 text-emerald-700">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 opacity-80" />
                    <div className="text-xs leading-relaxed font-semibold">
                      {printNotice}
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Single Printer Mode Toggle */}
                  <label className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center gap-2">
                      <ReceiptText size={16} className={singlePrinterMode ? "text-amber-500" : "text-slate-400"} />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 leading-none">Single Printer Mode</span>
                        <span className="text-[10px] font-medium text-slate-500 mt-1">Print KOT & Receipt together</span>
                      </div>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${singlePrinterMode ? 'bg-amber-500' : 'bg-slate-300'}`}>
                      <span className="sr-only">Toggle single printer mode</span>
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${singlePrinterMode ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                      <input 
                        type="checkbox" 
                        className="absolute opacity-0 w-0 h-0"
                        checked={singlePrinterMode}
                        onChange={(event) => onSinglePrinterModeChange?.(event.target.checked)}
                      />
                    </div>
                  </label>

                  {/* KOT Printer Dropdown */}
                  <div className="space-y-1.5 focus-within:-translate-y-[1px] transition-transform">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">KOT Printer Target</label>
                    <div className="relative">
                      <ChefHat size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        className="w-full pl-9 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl text-xs font-bold text-slate-700 transition-all appearance-none outline-none cursor-pointer"
                        value={kotPrinterAddress || ''}
                        onChange={(event) => onKotPrinterChange?.(event.target.value)}
                      >
                        <option value="">Auto Select First</option>
                        {printers.map((printer) => (
                          <option key={`kot-${printer.address || printer.name}`} value={printer.address || ''}>
                            {printer.name || printer.address || 'Unknown'}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Receipt Printer Dropdown */}
                  <div className={`space-y-1.5 transition-all ${singlePrinterMode ? 'opacity-40 grayscale pointer-events-none' : 'focus-within:-translate-y-[1px]'}`}>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Receipt Printer Target</label>
                    <div className="relative">
                      <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        className="w-full pl-9 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl text-xs font-bold text-slate-700 transition-all appearance-none outline-none cursor-pointer"
                        value={receiptPrinterAddress || ''}
                        onChange={(event) => onReceiptPrinterChange?.(event.target.value)}
                        disabled={singlePrinterMode}
                      >
                        <option value="">Skip Receipt</option>
                        {printers.map((printer) => (
                          <option key={`receipt-${printer.address || printer.name}`} value={printer.address || ''}>
                            {printer.name || printer.address || 'Unknown'}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleStockWarnings?.()}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors hover:scale-[1.02] ${
              stockWarningsEnabled
                ? 'bg-rose-50/80 border-rose-200 text-rose-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <AlertTriangle size={12} className={stockWarningsEnabled ? 'text-rose-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">{stockWarningsEnabled ? 'Stock alerts on' : 'Stock alerts off'}</span>
          </button>

          <div className="h-8 w-px bg-slate-200/60 hidden sm:block"></div>

          <button
            type="button"
            onClick={() => onOpenAlerts?.()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:scale-[1.02] transition-transform"
          >
            <Bell size={12} className="text-slate-500" />
            Alerts
            {lowStockCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                {lowStockCount}
              </span>
            )}
          </button>

          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold tracking-tight text-slate-700">06:42 PM</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tue, Mar 25</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default CounterHeader;
