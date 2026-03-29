import { ChefHat, CheckCircle2, Printer } from 'lucide-react';

function CounterHeader() {
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
          <div className="hidden md:block">
            <div className="flex items-center gap-2 bg-emerald-50/80 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm">
              <Printer size={14} className="opacity-80" />
              <span className="text-xs font-semibold tracking-wide whitespace-nowrap">SunsetPoint-Thermal</span>
              <CheckCircle2 size={14} className="opacity-80" />
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200/60 hidden sm:block"></div>

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
